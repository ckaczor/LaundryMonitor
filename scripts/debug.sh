﻿touch /home/ckaczor/laundry_monitor/.foreverignore
sudo forever --minUptime 1000 --spinSleepTime 1000 --watch --watchIgnore *.html --watchDirectory /home/ckaczor/laundry_monitor /home/ckaczor/laundry_monitor/main.js | bunyan