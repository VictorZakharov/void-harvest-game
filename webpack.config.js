const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = (env, argv) => {
    const isProduction = argv.mode === 'production';

    return {
        mode: isProduction ? 'production' : 'development',
        entry: './js/main.js',
        output: {
            path: path.resolve(__dirname, 'dist'),
            filename: isProduction ? 'game.[contenthash:8].js' : 'game.js',
            clean: true,
        },
        module: {
            rules: [
                {
                    test: /\.css$/,
                    use: [
                        isProduction ? MiniCssExtractPlugin.loader : 'style-loader',
                        'css-loader'
                    ],
                },
            ],
        },
        plugins: [
            new HtmlWebpackPlugin({
                template: './index.html',
                inject: 'body',
            }),
            ...(isProduction ? [
                new MiniCssExtractPlugin({
                    filename: 'styles.[contenthash:8].css',
                }),
            ] : []),
        ],
        devtool: isProduction ? 'source-map' : 'eval-source-map',
        devServer: {
            static: false, // Serve from memory, not from disk
            port: 3000,
            open: true,
            hot: true,
            compress: true,
            devMiddleware: {
                writeToDisk: false, // Don't write files to disk in dev mode
            },
        },
    };
};
