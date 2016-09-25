'use strict';

const del = require('del');
const gulp = require('gulp');
const wait = require('gulp-wait');
const mocha = require('gulp-spawn-mocha');
const plumber = require('gulp-plumber');
const nodemon = require('gulp-nodemon');
const eslint = require('gulp-eslint');
const webpackStream = require('webpack-stream');
const webpackClientConfig = require('./webpack');

gulp.task('clean-client', () => {
  return del([
    'build/**/*',
  ]);
});

gulp.task('build-client', ['clean-client'], () => {
  return gulp.src('./client/index.js')
    .pipe(webpackStream(webpackClientConfig))
    .pipe(gulp.dest('build/'));
});

gulp.task('lint', () => {
  return gulp.src(['**/*.js', '!node_modules/**', '!build/**'])
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failAfterError());
});

/** NOTE: Mocha Server Integration Tests depend on having pre-built
          client-side HTML and JS assets, to test serving HTML page.
          Keep 'build-client' task dependency!
          **/
gulp.task('test-server-integration', ['build-client'], () => {
  gulp.src('./test/integration/serverSpec.js', {read: false})
    .pipe(plumber())
    .pipe(wait(1500))
    .pipe(mocha())
    .once('error', () => {
      process.exit(1);
    })
    .once('end', () => {
      process.exit();
    });
});

gulp.task('nodemon', cb => {
  let started = false;
  return nodemon({
    script: './server',
    watch: ['./server'],
    ext: 'js',
  }).on('start', () => {
    if (!started) {
      cb();
      started = true;
    }
  })
  .on('crash', () => {
    console.log('nodemon.crash');
  })
  .on('restart', () => {
    console.log('nodemon.restart');
  })
  .once('quit', () => {
    process.exit();
  });
});

/** Composed Gulp Tasks **/
gulp.task('test-server', ['test-server-integration']);
gulp.task('test', ['lint', 'test-server']);
gulp.task('client', ['clean-client', 'build-client']);

/** Default Task (Client build) **/
gulp.task('default', ['client']);

/** Development Gulp Tasks **/
gulp.task('dev', ['client', 'test', 'nodemon'], () => {
  gulp.watch('./server/**/*.js', {debounceDelay: 500}, ['test']);
  gulp.watch('./client/**/*.js', {debounceDelay: 500}, ['lint', 'client']);
  gulp.watch('./test/server/**/*.js', {debounceDelay: 500}, ['test']);
});
