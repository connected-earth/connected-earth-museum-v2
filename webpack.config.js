const path = require('path');
const glob = require('fast-glob');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

function transform_json_paths(content, normalizedPublicPath) {
    try {
      const json = JSON.parse(content.toString());

      const processObject = (json) => {
        json.forEach((obj) => {
            Object.keys(obj).forEach((key) => {
                if (typeof obj[key] === 'string' && (obj[key].startsWith('/') || obj[key].startsWith('./') || obj[key].startsWith('../'))) {
                    obj[key] = normalizedPublicPath + obj[key].replace(/^\//, '');
                  }
            })
        })
      };

      processObject(json);

      return JSON.stringify(json, null, 2);
    } catch (e) {
      console.error(`Error processing JSON file ${file}:`, e);
      return content;
    }
}



module.exports = (env = {}) => {
  const isProd = env.NODE_ENV === 'production';
  const publicPath = env.PUBLIC_URL || '/';

  console.log('publicPath', publicPath);

  const normalizedPublicPath = publicPath.endsWith('/') ? publicPath : `${publicPath}/`;
  const ignore = ['assets/**/*', 'node_modules']
  // Discover all HTML pages under src (excluding src/assets)
  const pages = glob.sync('**/*.html', {
    cwd: path.resolve(__dirname),
    ignore,
  });

  const css_files = glob.sync('**/*.css', {
    cwd: path.resolve(__dirname),
    ignore,
  });

  const js_files = glob.sync('**/*.js', {
    cwd: path.resolve(__dirname),
    ignore,
  });

  return {
    mode: isProd ? 'production' : 'development',
    // No JS/CSS entry—assets are static
    output: {
      path: path.resolve(__dirname, 'dist'),
      publicPath: normalizedPublicPath,
      clean: true
    },
    entry: './index.js',
    plugins: [
      new CleanWebpackPlugin(),

      // Copy everything under src/assets to dist/assets (preserves folder structure)
      new CopyWebpackPlugin({
        patterns: [
          {
            from: path.resolve(__dirname, 'assets'),
            to: path.resolve(__dirname, 'dist/assets'),
            noErrorOnMissing: true
          },

          ...css_files.map((file) => ({
            from: path.resolve(__dirname, file),
            to: path.resolve(__dirname, 'dist', file),
            noErrorOnMissing: true
          })),
          ...js_files.map((file) => ({
            from: path.resolve(__dirname, file),
            to: path.resolve(__dirname, 'dist', file),
            noErrorOnMissing: true
          })),

          {
            from: path.resolve(__dirname, 'assets', 'museum', 'paintings.json'),
            to: path.resolve(__dirname, 'dist',  'assets', 'museum', 'paintings.json'),
            noErrorOnMissing: true,
            transform: (content) => transform_json_paths(content, normalizedPublicPath)
          },
        ]
      }),


      // Generate an HtmlWebpackPlugin instance for each HTML page
      ...pages.map((page) => {
        return new HtmlWebpackPlugin({
          template: path.resolve(__dirname, page),
          filename: page,
          inject: 'body',
          templateParameters: {
            // expose PUBLIC_URL inside EJS if needed
            PUBLIC_URL: publicPath.replace(/\/$/, '')
          }
        });
      })
    ],
    devServer: {
      static: path.join(__dirname, 'dist'),
      compress: true,
      port: 9000,
      // allow nested page routing
      historyApiFallback: {
        rewrites: pages.map((page) => ({
          from: new RegExp(`^/${page}$`),
          to: `/${page}`
        }))
      }
    }
  };
};