var gulp = require('gulp');
var ts = require('gulp-typescript');
var merge = require('merge2');
var runSequence = require('run-sequence');
var dirSync = require('gulp-directory-sync');

gulp.task('transpile', function () {
    var tsResult = gulp.src('app/*.ts')
        .pipe(ts({
            declarationFiles: false,
            noResolve: false,
            noImplicitAny: true,
            module: 'commonjs',
            moduleResolution: 'node',
            outDir: 'release'
        }));

    return merge([
        tsResult.dts.pipe(gulp.dest('release/definitions')),
        tsResult.js.pipe(gulp.dest('release'))
    ]);
});

gulp.task('watch', function () {
    gulp.watch(['app/**/*', 'scripts/**/*'], ['build']);
});

gulp.task('deploy', function () {
    return gulp.src('')
        .pipe(dirSync('release', '/mnt/chip/laundry_monitor', { printSummary: true, ignore: ['node_modules', '.foreverignore'] }))
        .on('error', function () { });
});

gulp.task('package', function () {
    gulp.src('package.json').pipe(gulp.dest('release'));
    gulp.src('scripts/*.sh').pipe(gulp.dest('release'));
    gulp.src('app/index.html').pipe(gulp.dest('release'));
});

gulp.task('build', function (done) {
    runSequence('transpile', 'package', 'deploy', function () {
        done();
    });
});
