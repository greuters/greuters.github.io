const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const TerserPlugin = require("terser-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");

module.exports = {
  module: {
   },
};

module.exports = {
  mode: 'none',
  devtool: "source-map",
  entry: "./webpack/entry.js",
  output: {
    path: __dirname + "/assets/dist/",
    filename: "bundle.js"
  },
  plugins: [
    new MiniCssExtractPlugin(),
    new CleanWebpackPlugin(
        {verbose: true}
    )
  ],
  module: {
    rules: [
      {
        test: /\.s?css$/,
        use: [
            MiniCssExtractPlugin.loader,
            "css-loader",
            "sass-loader"
        ],
      }
    ],
  },
  optimization: {
      minimizer: [
          new TerserPlugin({
            terserOptions: {
              compress: {
                drop_console: true,
              },
              mangle: true,
            },
          }),
         new CssMinimizerPlugin(),
      ],
  }
};
