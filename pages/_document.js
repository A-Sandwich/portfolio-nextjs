// pages/_document.js
import { Html, Head, Main, NextScript } from 'next/document'
import Footer from './footer.js';

export default function Document() {
  return (
    <Html>
      <Head>
        <link rel="preconnect" href="https://fonts.googleapis.com"/>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true"/>
        <link href="https://fonts.googleapis.com/css2?family=Arimo&family=Roboto+Mono&display=swap" rel="stylesheet"/>
      </Head>
      <body>
        <Main />
        <NextScript />
        
        <Footer />
      </body>
    </Html>
  )
}