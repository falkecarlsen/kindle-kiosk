podman run --rm -v "$PWD":/build -w /build debian:bookworm bash -c \
"apt update >/dev/null && apt install -y gcc-arm-linux-gnueabi >/dev/null && \
 arm-linux-gnueabi-gcc -Os -static -s hid-client.c -o hid-client"
