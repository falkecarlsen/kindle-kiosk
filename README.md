# kindle-kiosk

Interactive, Kindle-powered kiosk. Motivated by need for e-ink based control and sensor presentation.

## TODO
- Rewrite server structure to be modular
- Reverse flow of screen refresh, server pushes new frame to enable better interactivity
- Formalise hacks for kindle (stop native framework, autostart kiosk suite, disable screensaver, etc)
- Harden connections (avoid long lived token from HA, impl auth for Kindle-server connection and/or enable TLS)

## Hardware
Kindle Paperwhite 7th generation (PW3), firmware: 5.13.6. Jailbroken with USBnetworking for sshd over wifi.

## hid-client
Captures input device events and POST events to server

## server
Bun-based service aggregating data (e.g. Home Assistant, Prometheus, Grafana), constructing 8-bit grayscale image for Kindle to poll and present on image.



