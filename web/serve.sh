#!/usr/bin/env bash
# Serve ahmotools with Cross-Origin-Isolation headers required by ffmpeg.wasm.
# Usage: ./serve.sh
# Then open http://localhost:8080

PORT=${1:-8080}

echo "ahmotools — serving on http://localhost:$PORT"
echo "Press Ctrl+C to stop."

python3 -c "
import http.server, functools

class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cross-Origin-Opener-Policy', 'same-origin')
        self.send_header('Cross-Origin-Embedder-Policy', 'credentialless')
        super().end_headers()

http.server.HTTPServer(('', $PORT), Handler).serve_forever()
"
