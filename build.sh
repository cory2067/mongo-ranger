#!/bin/sh

set -e

mkdir -p bin
cd bin
npx pkg ..

echo "Binaries created in ./bin"
