# kindle-kiosk
Interactive, Kindle-powered kiosk. Motivated by need for at-a-glance control and sensor presentation on a nice e-ink display.

Perhaps a better solution is to buy a newer e-ink display with multicolour support. 

## Hardware
Kindle Paperwhite 7th generation (PW3), firmware: 5.13.6. Jailbroken with USBnetworking for sshd over wifi.

DPI is more than sufficient, but screen size at 6 inches could be bumped.

## hid-client
Captures input device events and POSTs events to server. Touch events are sent at touch-release at latest coordinate. Power button presses are masked in device and sent as well.

## server
Bun-based service aggregating data (e.g. Home Assistant, Prometheus, Grafana), constructing 8-bit grayscale image for Kindle to poll and present on image.

## TODO
- Reverse flow of screen refresh, server pushes new frame to enable better interactivity
    - Kindle input emit and immediately request new frame. Input then triggers new fetch after input is applied, and responds in turn.
- Formalise hacks for kindle (stop native framework, autostart kiosk suite, disable screensaver, etc)
    - Balance battery charging akin to TLP with start, stop thresholds
- Harden connections (impl auth for Kindle-server connection and/or enable TLS, avoid long lived token from HA if possible)
