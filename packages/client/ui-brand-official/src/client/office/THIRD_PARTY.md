# Three.js renderer

The isolated office scene embeds Three.js 0.160.1, the version used in the approved Phoenix preview, from https://unpkg.com/three@0.160.1/build/three.min.js. `three-source.ts` is a JavaScript string encoding of those unchanged bytes. This avoids network requests and remote script execution at application runtime; it does not change Harness dependencies. The scene and employee data do not have access to the parent origin, API credentials, storage, or network. Only the parent component sends roster snapshots and handles validated selection intents.

Source: https://github.com/mrdoob/three.js/tree/r160

License: https://unpkg.com/three@0.160.1/LICENSE

The MIT License

Copyright © 2010-2023 three.js authors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
