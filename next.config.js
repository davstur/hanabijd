/* eslint-disable @typescript-eslint/no-var-requires */

require("dotenv").config();

module.exports = async (phase, { defaultConfig }) => {
  delete defaultConfig["webpackDevMiddleware"];
  delete defaultConfig["configOrigin"];
  delete defaultConfig["target"];
  delete defaultConfig["webpack5"];
  delete defaultConfig.amp["canonicalBase"];

  return {
    productionBrowserSourceMaps: true,
    assetPrefix: "/",
    experimental: {},
    images: {
      domains: ["localhost"],
    },
  };
};
