import * as esbuild from 'esbuild';

await esbuild.build({
    entryPoints: ['F:/web/sigo/frontend/src/_preview030.tsx'],
    bundle: true,
    outfile: 'F:/web/sigo/.pdftmp/preview.js',
    jsx: 'automatic',
    define: { 'process.env.NODE_ENV': '"production"' },
    loader: { '.png': 'dataurl' },
    logLevel: 'warning',
});
console.log('BUILD_OK');
