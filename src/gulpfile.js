const gulp = require('gulp');
const sass = require('gulp-sass');
const postcss = require('gulp-postcss');
const csso = require('gulp-csso');
const autoprefixer = require('gulp-autoprefixer');
const cssnano = require('cssnano');
const concat = require('gulp-concat');
const terser = require('gulp-terser');
const connect = require('gulp-connect');
const WEBSERVER_PORT = 8888;

// Compile SCSS to csss
gulp.task('scss', function () {
  return gulp.src(['./scss/betafolio-fees-calculator.scss'])
    .pipe(sass().on('error', sass.logError))
    .pipe(csso({
      restructure: true,
      sourceMap: false,
      debug: false
    }))
    .pipe(autoprefixer())
    .pipe(postcss([
      cssnano({ safe: true }),
    ]))
    .pipe(gulp.dest('../dist/css'))
    .pipe(connect.reload());
});

// Concatenate js files and uglify (minifiy)
gulp.task('js', function () {
  return gulp
    .src([
      "./node_modules/papaparse/papaparse.min.js",
      "./node_modules/cleave.js/dist/cleave.min.js",
      "./node_modules/numeral/min/numeral.min.js",
      "./js/betafolio-fees-calculator.js",
      "./vendor/highcharts/highcharts.js",
      "./vendor/highcharts/exporting.js",
      "./vendor/dayjs/dayjs.min.js",
      "./js/main.js"
    ])
    .pipe(concat('betafolio-fees-calculator.js'))
    .pipe(terser({
      keep_fnames: true,
      mangle: false
    }))
    .pipe(gulp.dest('../dist/js'))
    .pipe(connect.reload());
});

// connect oto a web server
gulp.task('connect', function () {
  connect.server({
    root: '../',
    port: WEBSERVER_PORT,
    livereload: true,
  });
});


// gulp task and watcher
gulp.task("default", gulp.series("scss", "js", "connect", function () {
  gulp.watch("scss/**/*.scss", gulp.series("scss"));
  gulp.watch(["js/**/*.js", "gulpfile.js"], gulp.series("js"))
}));
