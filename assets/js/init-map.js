function GpxTrack(map, trackNumber, color, vehicle, highResPath, lowResPath, devMode) {
    this.map = map;
    this.trackNumber = trackNumber;
    this.color = color;
    this.vehicle = vehicle;
    this.highResPath = highResPath;
    this.lowResPath = lowResPath;
    this.devMode = devMode;

    this.displayLowRes = function () {
        if (this.lowResGpx) {
            if (this.highResGpx) {
                this.highResGpx.remove();
            }
            this.lowResGpx.addTo(this.map);
        } else {
            this.loadLowRes(true);
        }
    };

    this.loadLowRes = function (displayWhenLoaded) {
        let gpx = new L.GPX(this.lowResPath, {
            async: true,
            marker_options: {
                startIconUrl: '',
                endIconUrl: '',
                shadowUrl: ''
            },
            polyline_options: { color: this.color },
        }).on('loaded', (event) => {
            // discard all but the first successful attempt if load was triggered multiple times
            if (this.lowResGpx == undefined) {
                this.lowResGpx = event.target;
                if (displayWhenLoaded) {
                    this.displayLowRes();
                }
            }
        });
        if (this.devMode) {
            gpx.bindTooltip(this.lowResPath)
        }
    };

    this.displayHighRes = function () {
        if (this.highResGpx) {
            if (this.lowResGpx) {
                this.lowResGpx.remove();
            }
            this.highResGpx.addTo(this.map);
        } else {
            let gpx = new L.GPX(this.highResPath, {
                async: true,
                marker_options: {
                    startIconUrl: '',
                    endIconUrl: '',
                    shadowUrl: ''
                },
                polyline_options: { color: this.color },
            }).on('loaded', (event) => {
                // discard all but the first successful attempt if load was triggered multiple times
                if (this.highResGpx == undefined) {
                    this.highResGpx = event.target;
                    this.displayHighRes();
                }
            });
            if (this.devMode) {
                gpx.bindTooltip(this.highResPath)
            }
        }
    };

    this.undisplay = function () {
        if (this.lowResGpx) {
            this.lowResGpx.remove();
        }
        if (this.highResGpx) {
            this.highResGpx.remove();
        }
    };

    this.loadLowRes(false);
};

function TrackManager(map, trackData, devMode) {
    this.intervalId = null;
    this.animationDelay = 100; // [ms]
    this.currentTrackIdx = 0;
    this.map = map;

    this.tracks = [];
    for (let data of trackData) {
        this.tracks.push(new GpxTrack(
            map,
            data['trackNumber'],
            data['color'],
            data['vehicle'],
            data['highresPath'],
            data['lowresPath'],
            devMode,
        ));
    }

    this.showAnimation = function () {
        if (!this.intervalId) {
            this.currentTrackIdx = 0;
            for (let track of this.tracks) {
                track.undisplay();
            }
            this.intervalId = setInterval(() => this.tick(), this.animationDelay);
        }
    };

    this.showLowRes = function () {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        for (let track of this.tracks) {
            track.displayLowRes();
        }
    };

    this.showHighRes = function () {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        for (let track of this.tracks) {
            if (track.lowResGpx && track.lowResGpx.getBounds().intersects(this.map.getBounds())) {
                track.displayHighRes();
            } else {
                track.displayLowRes();
            }
        }
    };

    this.tick = function () {
        if (this.currentTrackIdx < this.tracks.length) {
            const currentTrack = this.tracks[this.currentTrackIdx];
            currentTrack.displayLowRes();
            if (currentTrack.lowResGpx) {
                this.currentTrackIdx++;
            }
        }
    };
};

function createMap(dataset) {
    const map = L.map('map', {
        minZoom: 1,
        maxZoom: 16,
        zoomControl: false,
    });
    map.scrollWheelZoom.disable();
    map.addControl(new L.Control.Zoom({
        zoomInTitle: dataset.zoomInL10n,
        zoomOutTitle: dataset.zoomOutL10n,
    }));
    map.addControl(new L.Control.Fullscreen({
        title: {
            'false': dataset.viewFullscreenL10n,
            'true': dataset.exitFullscreenL10n,
        }
    }));
    L.control.scale({ imperial: false, metric: true }).addTo(map);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
    map.fitBounds(JSON.parse(dataset.initBounds));
    return map;
}

window.onload = function () {
    const script = document.getElementById('init-map');
    const devMode = script.dataset.devMode === 'true';

    const map = createMap(script.dataset);
    const trackManager = new TrackManager(map, JSON.parse(document.getElementById("track-data").text), devMode);

    map.on('fullscreenchange', function () {
        if (map.isFullscreen()) {
            map.scrollWheelZoom.enable();
        } else {
            map.scrollWheelZoom.disable();
        }
    });

    map.on('moveend', function (e) {
        if (map.getZoom() > 9) {
            trackManager.showHighRes();
        }
    });

    map.on('zoomend', function (e) {
        if (map.getZoom() < 5) {
            trackManager.showAnimation();
        } else if (map.getZoom() > 9) {
            trackManager.showHighRes();
        } else {
            trackManager.showLowRes();
        }
    });

    // start animation with a small delay to give a headstart to lowres path loading
    setTimeout(() => trackManager.showAnimation(), 100);
}