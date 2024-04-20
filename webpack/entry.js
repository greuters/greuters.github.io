import lightGallery from "lightgallery";
import lgAutoplay from "lightgallery/plugins/autoplay";
import lgThumbnail from "lightgallery/plugins/thumbnail";
import 'lightgallery/css/lightgallery.css';
import 'lightgallery/css/lg-autoplay.css';
import 'lightgallery/css/lg-thumbnail.css';

import L from "leaflet";
import 'leaflet-fullscreen/dist/Leaflet.fullscreen';
import 'leaflet-gpx/gpx';
import 'leaflet/dist/leaflet.css';
import 'leaflet-fullscreen/dist/leaflet.fullscreen.css';

import untar from 'tinytar-fix';
import ungzip from 'pako';

import invariant from 'tiny-invariant';


window.lightGallery = lightGallery;
window.lgAutoplay = lgAutoplay;
window.lgThumbnail = lgThumbnail;

window.L = L;

window.untar = untar.untar;
window.ungzip = ungzip.ungzip;

window.invariant = invariant;