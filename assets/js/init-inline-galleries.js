window.onload = function () {
    const scripts = document.getElementsByTagName('script');
    const scriptName = scripts[scripts.length - 1];

    const galleries = document.getElementsByClassName("inline-gallery-container");
    for (var i = 0; i < galleries.length; i++) {
        console.log('gallery: ', galleries[i]);
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
            // only start the first gallery automatically, as starting multiple messes up lgAutoplay
            // -> https://github.com/sachinchoolur/lightGallery/issues/1320
            slideShowAutoplay: i == 0,
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

        gallery.openGallery();
    }
}