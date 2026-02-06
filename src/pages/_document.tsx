import * as Sentry from "@sentry/browser";
import { Head, Html, Main, NextScript } from "next/document";
import React from "react";

process.on("unhandledRejection", (err) => {
  Sentry.captureException(err);
});

process.on("uncaughtException", (err) => {
  Sentry.captureException(err);
});

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* this font is used by the BuymeacoffeeButton component*/}
        <link href="https://fonts.googleapis.com/css?family=Cookie&display=optional" rel="stylesheet" />
        {/* iOS PWA support */}
        <meta content="yes" name="apple-mobile-web-app-capable" />
        <meta content="black-translucent" name="apple-mobile-web-app-status-bar-style" />
        <meta content="Hanab" name="apple-mobile-web-app-title" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
