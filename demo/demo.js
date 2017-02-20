require(['jquery', '../src/breakout'], function($, BreakoutModule) {
    $(function() {
        var imagesDiv = $('#images');

        $.get('https://www.reddit.com/r/EarthPorn/top.json?limit=50', function (data) {
            data.data.children.forEach(function (listing) {
                imagesDiv.append("<div class='img' style='background-image:url(" + listing.data.thumbnail + ")'></div>");
            });
        });

        $('#play').click(function () {
            new BreakoutModule.Breakout(".img")
        });
    });
});