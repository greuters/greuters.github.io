window.onload = function () {
    const scripts = document.getElementsByTagName('script');
    const scriptName = scripts[scripts.length - 1];

    const galleries = document.getElementsByClassName("inline-gallery-container");
    for (var i = 0; i < galleries.length; i++) {
        var gallery = lightGallery(galleries[i], {
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
            exThumbImage: 'data-external-thumb-image',
            strings: {
                closeGallery: scriptName.getAttribute('data-closeGalleryL10n'),
                toggleMaximize: scriptName.getAttribute('data-toggleMaximizeL10n'),
                previousSlide: scriptName.getAttribute('data-previousSlideL10n'),
                nextSlide: scriptName.getAttribute('data-nextSlideL10n'),
                download: scriptName.getAttribute('data-downloadL10n'),
                playVideo: scriptName.getAttribute('data-playVideoL10n'),
                mediaLoadingFailed: scriptName.getAttribute('data-mediaLoadingFailedL10n'),
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