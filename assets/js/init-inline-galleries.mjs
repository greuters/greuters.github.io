import lightGallery from "lightgallery";
import lgAutoplay from "lightgallery/plugins/autoplay/lg-autoplay.es5.js";
import lgThumbnail from "lightgallery/plugins/thumbnail/lg-thumbnail.es5.js";

import 'lightgallery/css/lightgallery.css';
import 'lightgallery/css/lg-autoplay.css';
import 'lightgallery/css/lg-thumbnail.css';

function init() {
    const script = document.getElementById('init-inline-galleries');
    const galleries = document.getElementsByClassName("inline-gallery-container");
    for (let i = 0; i < galleries.length; i++) {
        let gallery = lightGallery(galleries[i], {
            container: galleries[i],
            hash: false,
            closable: false,
            download: false, // disabled as it is not working atm with non-dynamic loading
            showMaximizeIcon: true,
            appendSubHtmlTo: '.lg-item',
            slideDelay: 400,
            speed: 500,
            showBarsAfter: 5000,
            hideBarsDelay: 1500,
            plugins: [lgAutoplay, lgThumbnail],
            slideShowAutoplay: false,
            slideShowInterval: 6000,
            defaultCaptionHeight: '1.5rem',
            strings: {
                closeGallery: script.dataset.closeGalleryL10n,
                toggleMaximize: script.dataset.toggleMaximizeL10n,
                previousSlide: script.dataset.previousSlideL10n,
                nextSlide: script.dataset.nextSlideL10n,
                download: script.dataset.downloadL10n,
                playVideo: script.dataset.playVideoL10n,
                mediaLoadingFailed: script.dataset.mediaLoadingFailedL10n,
            },
            thumbWidth: 60,
            thumbHeight: "40px",
            thumbMargin: 4,
        });

        // start / stop gallery automatically when it is visible / invisible
        // target lg-outer instead of the container itself, as the container has 0 height
        let target = gallery.$container.find('.lg-outer').first().selector;

        let options = {
            root: null,
            rootMargin: "0px",
            threshold: [0.0, 0.25, 0.5, 0.75, 1.0],
        };

        let callback = (entries, _) => {
            entries.forEach((entry) => {
                let lgOuter = entry.target;
                let isFullyVisible = entry.intersectionRatio >= 0.99;
                let isPlaying = lgOuter.classList.contains('lg-show-autoplay');
                if (isFullyVisible !== isPlaying) {
                    lgOuter.querySelector('.lg-autoplay-button').click();
                }
            });
        };

        let observer = new IntersectionObserver(callback, options);
        observer.observe(target);

        gallery.openGallery();
    }
}

init();