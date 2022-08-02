module.exports = {
  plugins: [
    require("postcss-preset-env")({
      features: {
        'nesting-rules': true,
      },
      autoprefixer: false,
    }),
  ],
};
