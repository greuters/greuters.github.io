class MapManager {
    static minZoom = 1;
    static maxZoom = 16;
    static scrollingMinZoom = 7;
    static highResMinZoom = 10;
    static animationMaxZoom = 4;

    constructor(map, trackData, postHtmls, devMode) {
        this.intervalId = null;
        this.animationDelay = 100; // [ms]
        this.currentTrackIdx = 0;
        this.map = map;

        this.map.on('fullscreenchange', () => {
            if (this.map.isFullscreen()) {
                this.map.scrollWheelZoom.enable();
                this.postObserver.disconnect();
            } else {
                this.map.scrollWheelZoom.disable();
                this.observePosts();
            }
        });

        this.map.on('moveend', () => {
            if (MapManager.highResMinZoom <= this.map.getZoom()) {
                this.showHighRes();
            }
        });

        this.map.on('zoomend', () => {
            if (this.map.getZoom() <= MapManager.animationMaxZoom) {
                this.showAnimation();
            } else if (this.map.getZoom() < MapManager.highResMinZoom) {
                this.showLowRes();
            } else {
                this.showHighRes();
            }
        });

        this.posts = [];
        const deferredPostMap = new Map(); // trackNumber:postHtml
        for (let postHtml of postHtmls) {
            const latLng = JSON.parse(postHtml.dataset.latLng);
            const trackNumber = Number(postHtml.dataset.trackNumber);
            if (latLng === null) {
                if (!deferredPostMap.has(trackNumber)) {
                    deferredPostMap.set(trackNumber, []);
                }
                deferredPostMap.get(trackNumber).push(postHtml);
            } else {
                this.posts.push(new Post(postHtml, L.latLng(latLng)));
            }
        }

        this.tracks = [];
        for (let data of trackData) {
            const track = new GpxTrack(
                Number(data['trackNumber']),
                data['color'],
                data['vehicle'],
                data['highresPath'],
                data['lowresPath'],
                devMode
            );
            this.tracks.push(track);
            if (deferredPostMap.has(track.trackNumber)) {
                track.loadLowRes((track) => {
                    for (let postHtml of deferredPostMap.get(track.trackNumber)) {
                        this.posts.push(new Post(postHtml, track.midpoint));
                    }
                    if (!this.map.isFullscreen()) {
                        this.observePosts();
                    }
                });
            } else {
                track.loadLowRes();
            }
        }

        this.postObserver = new IntersectionObserver((entries, _) => this.focusMaxVisiblePost(entries), {
            root: document,
            rootMargin: "-30% 0px 0px 0px", // magic link to #map css rule, giving the map 30vv if it is visible
            threshold: [0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
        });
        this.focusedPostHtml = postHtmls.toSorted((a, b) => Number(b.dataset.trackNumber) - Number(a.dataset.trackNumber))[0];
        this.observePosts();
    };

    observePosts() {
        this.postObserver.disconnect();
        for (let post of this.posts) {
            this.postObserver.observe(post.html);
        }
    };

    focusMaxVisiblePost(entries) {
        // update intersectionRatio of all changed posts
        for (let entry of entries) {
            for (let post of this.posts) {
                if (post.html === entry.target) {
                    post.intersectionRatio = entry.intersectionRatio;
                    break;
                }
            }
        }

        // find latest post which is maximum visible, center map on it and raise it above all others
        let maxVisiblePost = null;
        for (let post of this.posts) {
            if (post.intersectionRatio === undefined) {
                post.intersectionRatio = 0;
            }
            if (maxVisiblePost === null
                || maxVisiblePost.intersectionRatio < post.intersectionRatio
                || (maxVisiblePost.intersectionRatio == post.intersectionRatio && maxVisiblePost.trackNumber < post.trackNumber)) {
                maxVisiblePost = post;
            }
            post.marker.setZIndexOffset(0);
        }
        if (maxVisiblePost && maxVisiblePost.html !== this.focusedPostHtml) {
            if (this.map.getZoom() < MapManager.scrollingMinZoom) {
                this.map.setZoom(MapManager.scrollingMinZoom);
            }
            this.map.panTo(maxVisiblePost.marker.getLatLng(), { animate: true, easeLinearity: 0.3, duration: 1.5 });
            maxVisiblePost.marker.setZIndexOffset(1000);
            this.focusedPostHtml = maxVisiblePost.html;
        }
    };

    showAnimation() {
        if (!this.intervalId) {
            this.currentTrackIdx = 0;
            for (let track of this.tracks) {
                track.undisplay();
            }
            for (let post of this.posts) {
                post.undisplay();
            }
            this.intervalId = setInterval(() => this.tick(), this.animationDelay);
        }
    };

    showLowRes() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        for (let track of this.tracks) {
            track.displayLowRes(this.map);
        }
        for (let post of this.posts) {
            post.display(this.map);
        }
    };

    showHighRes() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        for (let track of this.tracks) {
            if (track.lowResGpx && track.lowResGpx.getBounds().intersects(this.map.getBounds())) {
                track.displayHighRes(this.map);
            } else {
                track.displayLowRes(this.map);
            }
        }
        for (let post of this.posts) {
            post.display(this.map);
        }
    };

    tick() {
        if (this.currentTrackIdx < this.tracks.length) {
            const currentTrack = this.tracks[this.currentTrackIdx];
            currentTrack.displayLowRes(this.map);

            for (let post of this.posts) {
                if (post.trackNumber <= this.currentTrackIdx) {
                    post.display(this.map);
                }
            }

            if (currentTrack.lowResGpx) {
                this.currentTrackIdx++;
            }
        }
    };
};

class GpxTrack {
    constructor(trackNumber, color, vehicle, highResPath, lowResPath, devMode) {
        this.trackNumber = trackNumber;
        this.color = color;
        this.vehicle = vehicle;
        this.highResPath = highResPath;
        this.lowResPath = lowResPath;
        this.devMode = devMode;
        this.currentDisplayState = null;
    }

    displayLowRes(map) {
        if (this.currentDisplayState === 'lowres') {
            return;
        }
        if (this.lowResGpx) {
            if (this.highResGpx) {
                this.highResGpx.remove();
            }
            this.lowResGpx.addTo(map);
            this.currentDisplayState = 'lowres';
        } else {
            this.loadLowRes((track) => {
                track.displayLowRes(map);
            });
        }
    };

    loadLowRes(onLoadedCallback) {
        new L.GPX(this.lowResPath, {
            async: true,
            marker_options: {
                startIconUrl: '',
                endIconUrl: '',
                shadowUrl: ''
            },
            polyline_options: { color: this.color },
        }).on('addline', (event) => {
            if (this.midpoint === undefined) {
                const latLngs = event.line._latlngs;
                this.midpoint = latLngs[Math.floor(latLngs.length / 2)];
            }
        }).on('loaded', (event) => {
            // discard all but the first successful attempt if load was triggered multiple times
            if (this.lowResGpx === undefined) {
                this.lowResGpx = event.target;
                if (this.devMode) {
                    this.lowResGpx.bindTooltip(`${this.lowResPath}, ${this.midpoint}`);
                }
                if (onLoadedCallback) {
                    onLoadedCallback(this);
                }
            }
        });
    };

    displayHighRes(map) {
        if (this.currentDisplayState === 'highres') {
            return;
        }

        if (this.highResGpx) {
            if (this.lowResGpx) {
                this.lowResGpx.remove();
            }
            this.highResGpx.addTo(map);
            this.currentDisplayState = 'highres';
        } else {
            new L.GPX(this.highResPath, {
                async: true,
                marker_options: {
                    startIconUrl: '',
                    endIconUrl: '',
                    shadowUrl: ''
                },
                polyline_options: { color: this.color },
            }).on('loaded', (event) => {
                // discard all but the first successful attempt if load was triggered multiple times
                if (this.highResGpx === undefined) {
                    this.highResGpx = event.target;
                    if (this.devMode) {
                        this.highResGpx.bindTooltip(`${this.highResPath}, ${this.midpoint}`);
                    }
                    this.displayHighRes(map);
                }
            });
        }
    };

    undisplay() {
        if (this.currentDisplayState === null) {
            return;
        }

        if (this.lowResGpx) {
            this.lowResGpx.remove();
        }
        if (this.highResGpx) {
            this.highResGpx.remove();
        }
        this.currentDisplayState = null;
    };
};

class Post {
    static thumbnailMaxDim = 100; // [px]; maximum width / height to normalize thumbnails
    static {
        this.scaleFactorMap = new Map();
        this.spreadFactorMap = new Map();
        for (var zoom = MapManager.minZoom; zoom <= MapManager.maxZoom; zoom++) {
            this.scaleFactorMap.set(zoom, 0.05 + Math.min(0.95, Math.pow((zoom - MapManager.minZoom) / 5, 2)));
            this.spreadFactorMap.set(zoom, 0.01 + Math.pow((MapManager.maxZoom - zoom) / (MapManager.maxZoom - MapManager.minZoom), 4) * 3);
        }
    }

    constructor(html, latLng) {
        this.html = html;
        this.trackNumber = Number(html.dataset.trackNumber);

        const previewImageHtml = html.querySelector(".preview-image img");
        const tW = Number(previewImageHtml.dataset.thumbnailWidth);
        const tH = Number(previewImageHtml.dataset.thumbnailHeight);
        const normalizationFactor = Post.thumbnailMaxDim / Math.max(tW, tH);
        const thumbnailWidth = tW * normalizationFactor;
        const thumbnailHeight = tH * normalizationFactor;

        this.iconMap = new Map();
        for (const [zoom, scaleFactor] of Post.scaleFactorMap) {
            this.iconMap.set(zoom,
                L.icon({
                    iconUrl: previewImageHtml.dataset.thumbnailPath,
                    iconSize: [thumbnailWidth * scaleFactor, thumbnailHeight * scaleFactor],
                }));
        }

        const spreadLatLng = L.latLng(JSON.parse(html.dataset.spreadLatLng));
        this.spreadPositionMap = new Map();
        for (const [zoom, spreadFactor] of Post.spreadFactorMap) {
            this.spreadPositionMap.set(zoom,
                L.latLng(
                    latLng.lat + spreadLatLng.lat * spreadFactor,
                    latLng.lng + spreadLatLng.lng * spreadFactor,
                ));
        }

        this.marker = L.marker(this.spreadPositionMap.get(MapManager.minZoom),
            {
                title: html.dataset.title,
                riseOnHover: true,
            }).on('click', () => {
                window.location = html.dataset.url;
            });

        this.currentDisplayState = { zoom: null };
    };

    display(map) {
        if (this.currentDisplayState.zoom === map.getZoom()) {
            return;
        }

        this.currentDisplayState.zoom = map.getZoom();
        this.marker.setLatLng(this.spreadPositionMap.get(map.getZoom()));
        this.marker.setIcon(this.iconMap.get(map.getZoom()));
        this.marker.addTo(map);
    };

    undisplay() {
        if (this.currentDisplayState.zoom === null) {
            return;
        }
        this.currentDisplayState.zoom = null;
        this.marker.remove();
    };
};

function createMap(dataset) {
    const map = L.map('map', {
        minZoom: MapManager.minZoom,
        maxZoom: MapManager.maxZoom,
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
    const trackManager = new MapManager(map,
        JSON.parse(document.getElementById("track-data").text),
        Array.from(document.querySelectorAll('#post-list .post-preview')),
        devMode);

    // start animation with a small delay to give a headstart for GPX track loading
    setTimeout(() => trackManager.showAnimation(), 100);
}