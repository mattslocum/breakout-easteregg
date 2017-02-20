define(["require", "exports", "jquery"], function (require, exports, $) {
    "use strict";
    var GAME_CONTAINER = "breakout-game";
    var BODY_CLASS = "breakout-body";
    var PADDLE_NAME = "breakout-paddle";
    var BALL_NAME = "breakout-ball";
    var BLOCK_NAME = "breakout-block";
    var DATA_NAME = "breakout";
    /**
     * USAGE: new Breakout(".mydivs"); // where the .mydivs are the elements that you want to be the blocks.
     * NOTE: If the block is too small, the ball might skip over it. The collision logic detects the ball
     *       moving inside the block.
     */
    var Breakout = (function () {
        function Breakout(selector) {
            this.gameOver = false;
            this.gameWon = false;
            this.blocks = [];
            this.paddleWidth = 160;
            this.paddleHeight = 14;
            this.paddleFromBottom = 20;
            this.paddlePos = Math.round((window.innerWidth - this.paddleWidth) / 2);
            this.ballPosX = this.paddlePos + Math.round(this.paddleWidth / 2);
            this.ballSize = 20;
            this.ballPosY = window.innerHeight - this.paddleFromBottom - this.paddleHeight - this.ballSize;
            // NOTE: If we make this too fast, we might skip over the block since the collision logic only detects
            //       the ball being inside the block
            this.ballSpeed = 8;
            this.ballDirX = 5;
            this.ballDirY = -5;
            // we only want one instance running at a time
            if ($("." + GAME_CONTAINER).length) {
                return;
            }
            this.makeStyles();
            this.createElements();
            this.prepBlocks(selector);
            window.requestAnimationFrame(this.tick.bind(this));
        }
        Breakout.prototype.destroy = function () {
            $(document).off('mousemove.breakout');
            this.$breakoutElem
                .off()
                .remove();
            $("." + BLOCK_NAME).each(function (index, elem) {
                var $elem = $(elem), data = $elem.data(DATA_NAME);
                if (data) {
                    elem.style.cssText = data.style;
                }
                $elem.removeClass(BLOCK_NAME + " transparent");
            });
            $(document.body).removeClass(BODY_CLASS);
        };
        Breakout.prototype.createElements = function () {
            var $breakout = $("<div class=\"" + GAME_CONTAINER + "\">\n    <button class=\"exit\" endGame>exit</button>\n    <div class=\"gameOver\" endGame>Game Over</div>\n    <div class=\"gameWon\" endGame>YOU WIN</div>\n    <div class=\"" + PADDLE_NAME + "\" style=\"left:" + this.paddlePos + "px\"></div>\n    <div class=\"" + BALL_NAME + "\" style=\"left:" + this.ballPosX + "px; top:" + this.ballPosY + "px\"></div>\n</div>");
            $breakout.appendTo('body');
            this.$breakoutElem = $breakout;
            this.paddle = $breakout.find('.' + PADDLE_NAME)[0];
            this.ball = $breakout.find('.' + BALL_NAME)[0];
            $(document.body).addClass(BODY_CLASS);
            this.addEvents();
        };
        Breakout.prototype.endGame = function () {
            if (this.gameWon) {
                this.$breakoutElem.find('.gameWon').show();
            }
            else {
                this.$breakoutElem.find('.gameOver').show();
            }
        };
        Breakout.prototype.makeStyles = function () {
            var styleID = "breakoutStyles";
            if (!document.getElementById(styleID)) {
                var css = "\n." + BODY_CLASS + " {\n    overflow: hidden;\n}\n." + PADDLE_NAME + " {\n    background-color: #1b9dd0;\n    border: 2px solid white;\n    border-radius: 5px;\n    bottom: " + this.paddleFromBottom + "px;\n    height: " + this.paddleHeight + "px;\n    position: fixed;\n    width: " + this.paddleWidth + "px;\n    z-index: 999999;\n}\n." + BALL_NAME + " {\n    background-color: #1b9dd0;\n    border: 2px solid white;\n    border-radius: " + this.ballSize / 2 + "px;\n    height: " + this.ballSize + "px;\n    position: fixed;\n    width: " + this.ballSize + "px;\n    z-index: 999999;\n}\n." + BLOCK_NAME + " {\n    z-index: 99999;\n}\n." + BLOCK_NAME + ".transparent {\n    opacity: 0 !important;\n}\n." + BLOCK_NAME + "::before {\n    background: #74a636;\n    border: 1px solid white;\n    content: \"\";\n    display: block;\n    height: 100%;\n    opacity: 0.5;\n    position: absolute;\n    width: 100%;\n    z-index: 99999;\n}\n." + GAME_CONTAINER + " .exit {\n    background: red;\n    color: white;\n    font-weight: bold;\n    border: 0;\n    border-radius: 0 0 0 5px;\n    padding: 10px 20px;\n    position: fixed;\n    right: 0;\n    top: 0;\n    z-index: 99999;\n}\n." + GAME_CONTAINER + " .gameOver,." + GAME_CONTAINER + " .gameWon {\n    background: red;\n    color: white;\n    cursor: pointer;\n    display: none;\n    font-size: 60px;\n    font-weight: bold;\n    font-family: Impact;\n    left: 50%;\n    padding: 0px 10px;\n    position: fixed;\n    top: 50%;\n    transform: translate(-50%, -50%);\n    z-index: 999999;\n}\n";
                var elStyle = document.createElement('style');
                elStyle.id = styleID;
                elStyle.innerHTML = css;
                document.getElementsByTagName('head')[0].appendChild(elStyle);
            }
        };
        Breakout.prototype.addEvents = function () {
            $(document).on('mousemove.breakout', this.movePaddle.bind(this));
            this.$breakoutElem.on('click', '[endGame]', this.destroy.bind(this));
        };
        Breakout.prototype.prepBlocks = function (selector) {
            var _this = this;
            var scrollOffset = $(window).scrollTop(), blocks = $(selector)
                .filter(':visible')
                .filter(function (index, element) {
                var pos = $(element).offset();
                // nothing off the top of the visible screen or below the bottom 250 px
                return pos.top - scrollOffset >= 0 && pos.top - scrollOffset < window.innerHeight - 250;
            });
            if (!blocks.length) {
                // there is nothing to hit. Lets pretend this never happened.
                this.destroy();
                return;
            }
            blocks.each(function (index, elem) {
                var $elem = $(elem), elData = _this.generateElemData($elem);
                _this.blocks.push(elData);
                $elem.data(DATA_NAME, elData);
            });
            // addClass after we do the placement because the class has position fixed and will cause a re-draw.
            blocks.each(function (index, elem) {
                $(elem).addClass(BLOCK_NAME);
            });
        };
        Breakout.prototype.generateElemData = function ($elem) {
            var pos = $elem.offset(), 
            // adjust for window scroll.
            scrollOffset = $(window).scrollTop();
            return {
                left: pos.left,
                right: pos.left + $elem.width(),
                top: pos.top - scrollOffset,
                bottom: pos.top + $elem.height() - scrollOffset,
                style: $elem[0].style.cssText,
                $elem: $elem
            };
        };
        Breakout.prototype.movePaddle = function (event) {
            // keep paddle within the bounds of the screen
            this.paddlePos = Math.max(0, Math.min(event.pageX - Math.round(this.paddleWidth / 2), window.innerWidth - this.paddleWidth));
            this.paddle.style.left = this.paddlePos + "px";
        };
        Breakout.prototype.tick = function () {
            this.moveBall();
            if (this.gameOver || this.gameWon) {
                this.endGame();
            }
            else {
                // INFINITE LOOP!
                window.requestAnimationFrame(this.tick.bind(this));
            }
        };
        Breakout.prototype.moveBall = function () {
            // optimistic that we will continue to move forward.
            this.ballPosX += this.ballDirX;
            this.ballPosY += this.ballDirY;
            var inBlock = this.inBlock();
            if (this.hasCollideVert() || inBlock != -1) {
                // reverse the Y move
                this.ballDirY *= -1;
                this.ballPosY += this.ballDirY;
                if (inBlock != -1 && inBlock == this.inBlock()) {
                    // oops that didn't help. Lets re-reverse. Horz will fix it.
                    this.ballDirY *= -1;
                    this.ballPosY += this.ballDirY;
                }
                else if (inBlock != -1) {
                    this.removeBlock(inBlock);
                }
            }
            inBlock = this.inBlock();
            if (this.hasCollideHorz() || inBlock != -1) {
                // reverse the X move
                this.ballDirX *= -1;
                this.ballPosX += this.ballDirX;
                if (inBlock != -1) {
                    this.removeBlock(inBlock);
                }
            }
            var paddleHit = this.paddleHit();
            if (paddleHit != -1) {
                // 140 is the max angle that we want out of the paddle
                // + 20 to center the angle
                var ang = paddleHit / this.paddleWidth * 140 + 20;
                // negating this.ballSpeed because we want the paddle to direct the ball up.
                this.ballDirY = Math.sin(ang * Math.PI / 180) * -this.ballSpeed;
                this.ballDirX = Math.cos(ang * Math.PI / 180) * -this.ballSpeed;
            }
            // did the ball fall off the bottom of the screen
            if (this.ballPosY >= window.innerHeight) {
                this.gameOver = true;
            }
            this.ball.style.left = this.ballPosX + "px";
            this.ball.style.top = this.ballPosY + "px";
        };
        // Used to detect ball vertical collision that isn't a block or paddle
        Breakout.prototype.hasCollideVert = function () {
            return this.ballPosY < 0;
        };
        // Used to detect ball horizontal collision that isn't a block or paddle
        Breakout.prototype.hasCollideHorz = function () {
            return (this.ballPosX + this.ballSize > window.innerWidth) ||
                (this.ballPosX < 0);
        };
        // NOTE: This algorithm doesn't work if we are moving fast enough to pass right over a block instead of inside it.
        Breakout.prototype.inBlock = function () {
            for (var i = 0; i < this.blocks.length; i++) {
                if (this.ballPosX + this.ballSize >= this.blocks[i].left &&
                    this.ballPosX <= this.blocks[i].right &&
                    this.ballPosY + this.ballSize >= this.blocks[i].top &&
                    this.ballPosY <= this.blocks[i].bottom) {
                    return i;
                }
            }
            return -1;
        };
        /**
         * Did the ball hit the paddle from the top? If so, return the location of the collision from the left edge. If not -1
         * @returns {number}
         */
        Breakout.prototype.paddleHit = function () {
            if (this.ballPosX + this.ballSize >= this.paddlePos &&
                this.ballPosX <= this.paddlePos + this.paddleWidth &&
                // current pos is on or below the paddle
                this.ballPosY + this.ballSize >= window.innerHeight - this.paddleFromBottom - this.paddleHeight &&
                // last position was above the paddle
                this.ballPosY - this.ballDirY < window.innerHeight - this.paddleFromBottom - this.paddleHeight) {
                return this.ballPosX - this.paddlePos;
            }
            return -1;
        };
        Breakout.prototype.removeBlock = function (i) {
            this.blocks[i].$elem.addClass('transparent');
            this.blocks.splice(i, 1);
            if (!this.blocks.length) {
                this.gameWon = true;
            }
        };
        return Breakout;
    }());
    exports.Breakout = Breakout;
});
