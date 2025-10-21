#include <stdio.h>
#include <linux/input.h>
#include <fcntl.h>
#include <unistd.h>
#include <time.h>
#include <sys/select.h>
#include <stdlib.h>

int main() {
    const char *server = getenv("SERVER");
    if (!server || !*server) {
        fprintf(stderr, "Error: SERVER environment variable not set\n");
        fprintf(stderr, "Usage: SERVER=http://<ip>:<port>/input %s\n", "input-listener");
        return 1;
    }

    int fd_touch = open("/dev/input/event1", O_RDONLY);
    int fd_power = open("/dev/input/event0", O_RDONLY);
    if (fd_touch < 0 || fd_power < 0) { perror("open"); return 1; }

    setvbuf(stdout, NULL, _IONBF, 0);

    struct input_event ev;
    int x=-1, y=-1;

    while (1) {
        fd_set fds;
        FD_ZERO(&fds);
        FD_SET(fd_touch, &fds);
        FD_SET(fd_power, &fds);
        int maxfd = (fd_touch > fd_power ? fd_touch : fd_power) + 1;
        select(maxfd, &fds, NULL, NULL, NULL);

        // --- Touchscreen ---
        if (FD_ISSET(fd_touch, &fds)) {
            while (read(fd_touch, &ev, sizeof(ev)) == sizeof(ev)) {
                if (ev.type == EV_ABS) {
                    if (ev.code == ABS_MT_POSITION_X) x = ev.value;
                    else if (ev.code == ABS_MT_POSITION_Y) y = ev.value;
                } else if (ev.type == EV_KEY && ev.code == BTN_TOUCH && ev.value == 0 && x >= 0 && y >= 0) {
                    char body[128];
                    snprintf(body, sizeof(body),
                        "{\"ts\":%ld,\"src\":\"touch\",\"x\":%d,\"y\":%d}",
                        time(NULL), x, y);
                    x = y = -1;
                    char cmd[256];
                    snprintf(cmd, sizeof(cmd),
                        "curl -s -X POST -H 'Content-Type: application/json' -d '%s' '%s' >/dev/null 2>&1 &",
                        body, server);
                    system(cmd);
                    break;
                } else break;
            }
        }

        // --- Power button ---
        if (FD_ISSET(fd_power, &fds)) {
            while (read(fd_power, &ev, sizeof(ev)) == sizeof(ev)) {
                if (ev.type == EV_KEY && ev.code == KEY_POWER && ev.value == 1) {
                    char body[128];
                    snprintf(body, sizeof(body),
                        "{\"ts\":%ld,\"src\":\"power\",\"action\":\"press\"}", time(NULL));
                    char cmd[256];
                    snprintf(cmd, sizeof(cmd),
                        "curl -s -X POST -H 'Content-Type: application/json' -d '%s' '%s' >/dev/null 2>&1 &",
                        body, server);
                    system(cmd);
                    break;
                } else break;
            }
        }
    }
}

