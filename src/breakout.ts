import * as $ from "jquery";

interface IBlockData {
    style : string;
    left : number;
    right : number;
    top : number;
    bottom : number;
    $elem : JQuery;
}

const GAME_CONTAINER : string = "breakout-game";
const BODY_CLASS : string = "breakout-body";
const PADDLE_NAME : string = "breakout-paddle";
const BALL_NAME : string = "breakout-ball";
const BLOCK_NAME : string = "breakout-block";
const DATA_NAME : string = "breakout";

/**
 * USAGE: new Breakout(".mydivs"); // where the .mydivs are the elements that you want to be the blocks.
 * NOTE: If the block is too small, the ball might skip over it. The collision logic detects the ball
 *       moving inside the block.
 */
export class Breakout {
    public gameOver : boolean = false;
    public gameWon : boolean = false;

    public $breakoutElem : JQuery;
    public ball : HTMLDivElement;
    public paddle : HTMLDivElement;
    public blocks : IBlockData[] = [];

    private paddleWidth : number = 160;
    private paddleHeight : number = 14;
    private paddleFromBottom : number = 20;
    private paddlePos : number = Math.round((window.innerWidth - this.paddleWidth) / 2);

    private ballPosX : number = this.paddlePos + Math.round(this.paddleWidth / 2);
    private ballSize : number = 20;
    private ballPosY : number = window.innerHeight - this.paddleFromBottom - this.paddleHeight - this.ballSize;
    // NOTE: If we make this too fast, we might skip over the block since the collision logic only detects
    //       the ball being inside the block
    private ballSpeed : number = 8;
    private ballDirX : number = 5;
    private ballDirY : number = -5;

    constructor(selector : string) {
        // we only want one instance running at a time
        if ($(`.${GAME_CONTAINER}`).length) {
            return;
        }

        this.makeStyles();
        this.createElements();
        this.prepBlocks(selector);

        window.requestAnimationFrame(this.tick.bind(this));
    }

    public destroy() : void {
        $(document).off('mousemove.breakout');
        this.$breakoutElem
            .off()
            .remove();

        $("." + BLOCK_NAME).each((index : number, elem : HTMLElement) => {
            let $elem : JQuery = $(elem),
                data : IBlockData = $elem.data(DATA_NAME);

            if (data) {
                elem.style.cssText = data.style;
            }
            $elem.removeClass(BLOCK_NAME + " transparent");
        });

        $(document.body).removeClass(BODY_CLASS);
    }

    private createElements() : void {
        let $breakout : JQuery = $(
`<div class="${GAME_CONTAINER}">
    <button class="exit" endGame>exit</button>
    <div class="gameOver" endGame>Game Over</div>
    <div class="gameWon" endGame>YOU WIN</div>
    <div class="${PADDLE_NAME}" style="left:${this.paddlePos}px"></div>
    <div class="${BALL_NAME}" style="left:${this.ballPosX}px; top:${this.ballPosY}px"></div>
</div>`);

        $breakout.appendTo('body');
        this.$breakoutElem = $breakout;
        this.paddle = <HTMLDivElement> $breakout.find('.' + PADDLE_NAME)[0];
        this.ball = <HTMLDivElement> $breakout.find('.' + BALL_NAME)[0];

        $(document.body).addClass(BODY_CLASS);

        this.addEvents();
    }

    private endGame() : void {
        if (this.gameWon) {
            this.$breakoutElem.find('.gameWon').show();
        } else {
            this.$breakoutElem.find('.gameOver').show();
        }
    }

    private makeStyles() : void {
        const styleID : string = "breakoutStyles";
        if (!document.getElementById(styleID)) {
            let css : string = `
.${BODY_CLASS} {
    overflow: hidden;
}
.${PADDLE_NAME} {
    background-color: #1b9dd0;
    border: 2px solid white;
    border-radius: 5px;
    bottom: ${this.paddleFromBottom}px;
    height: ${this.paddleHeight}px;
    position: fixed;
    width: ${this.paddleWidth}px;
    z-index: 999999;
}
.${BALL_NAME} {
    background-color: #1b9dd0;
    border: 2px solid white;
    border-radius: ${this.ballSize / 2}px;
    height: ${this.ballSize}px;
    position: fixed;
    width: ${this.ballSize}px;
    z-index: 999999;
}
.${BLOCK_NAME} {
    z-index: 99999;
}
.${BLOCK_NAME}.transparent {
    opacity: 0 !important;
}
.${BLOCK_NAME}::before {
    background: #74a636;
    border: 1px solid white;
    content: "";
    display: block;
    height: 100%;
    opacity: 0.5;
    position: absolute;
    width: 100%;
    z-index: 99999;
}
.${GAME_CONTAINER} .exit {
    background: red;
    color: white;
    font-weight: bold;
    border: 0;
    border-radius: 0 0 0 5px;
    padding: 10px 20px;
    position: fixed;
    right: 0;
    top: 0;
    z-index: 99999;
}
.${GAME_CONTAINER} .gameOver,.${GAME_CONTAINER} .gameWon {
    background: red;
    color: white;
    cursor: pointer;
    display: none;
    font-size: 60px;
    font-weight: bold;
    font-family: Impact;
    left: 50%;
    padding: 0px 10px;
    position: fixed;
    top: 50%;
    transform: translate(-50%, -50%);
    z-index: 999999;
}
`;

            let elStyle : HTMLStyleElement = document.createElement('style');
            elStyle.id = styleID;

            elStyle.innerHTML = css;
            document.getElementsByTagName('head')[0].appendChild(elStyle);
        }
    }

    private addEvents() : void {
        $(document).on('mousemove.breakout', this.movePaddle.bind(this));
        this.$breakoutElem.on('click', '[endGame]', this.destroy.bind(this));
    }

    private prepBlocks(selector : string) : void {
        let scrollOffset : number = $(window).scrollTop(),
            blocks : JQuery = $(selector)
            .filter(':visible')
            .filter((index : number, element : HTMLElement) => {
                let pos : JQueryCoordinates = $(element).offset();
                // nothing off the top of the visible screen or below the bottom 250 px
                return pos.top - scrollOffset >= 0 && pos.top - scrollOffset < window.innerHeight - 250;
            });

        if (!blocks.length) {
            // there is nothing to hit. Lets pretend this never happened.
            this.destroy();
            return;
        }

        blocks.each((index : number, elem : HTMLElement) => {
            let $elem : JQuery = $(elem),
                elData : IBlockData = this.generateElemData($elem);

            this.blocks.push(elData);
            $elem.data(DATA_NAME, elData);
        });
        // addClass after we do the placement because the class has position fixed and will cause a re-draw.
        blocks.each((index : number, elem : HTMLElement) => {
            $(elem).addClass(BLOCK_NAME);
        });
    }

    private generateElemData($elem : JQuery) : IBlockData {
        let pos : JQueryCoordinates = $elem.offset(),
            // adjust for window scroll.
            scrollOffset : number = $(window).scrollTop();

        return {
            left: pos.left,
            right: pos.left + $elem.width(),
            top: pos.top - scrollOffset,
            bottom: pos.top + $elem.height() - scrollOffset,
            style: $elem[0].style.cssText,
            $elem : $elem
        };
    }

    private movePaddle(event : JQueryMouseEventObject) : void {
        // keep paddle within the bounds of the screen
        this.paddlePos = Math.max(0,
            Math.min(event.pageX - Math.round(this.paddleWidth / 2), window.innerWidth - this.paddleWidth)
        );
        this.paddle.style.left = this.paddlePos + "px";
    }

    public tick() : void {
        this.moveBall();

        if (this.gameOver || this.gameWon) {
            this.endGame();
        } else {
            // INFINITE LOOP!
            window.requestAnimationFrame(this.tick.bind(this));
        }
    }

    private moveBall() : void {
        // optimistic that we will continue to move forward.
        this.ballPosX += this.ballDirX;
        this.ballPosY += this.ballDirY;

        let inBlock : number = this.inBlock();
        if (this.hasCollideVert() || inBlock != -1) {
            // reverse the Y move
            this.ballDirY *= -1;
            this.ballPosY += this.ballDirY;
            if (inBlock != -1 && inBlock == this.inBlock()) {
                // oops that didn't help. Lets re-reverse. Horz will fix it.
                this.ballDirY *= -1;
                this.ballPosY += this.ballDirY;
            } else if (inBlock != -1) {
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

        let paddleHit : number = this.paddleHit();
        if (paddleHit != -1) {
            // 140 is the max angle that we want out of the paddle
            // + 20 to center the angle
            let ang : number = paddleHit / this.paddleWidth * 140 + 20;
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
    }

    // Used to detect ball vertical collision that isn't a block or paddle
    private hasCollideVert() : boolean {
        return this.ballPosY < 0;
    }

    // Used to detect ball horizontal collision that isn't a block or paddle
    private hasCollideHorz() : boolean {
        return (this.ballPosX + this.ballSize > window.innerWidth) ||
            (this.ballPosX < 0);
    }

    // NOTE: This algorithm doesn't work if we are moving fast enough to pass right over a block instead of inside it.
    private inBlock() : number {
        for (let i : number = 0; i < this.blocks.length; i++) {
            if (this.ballPosX + this.ballSize >= this.blocks[i].left &&
                this.ballPosX <= this.blocks[i].right &&
                this.ballPosY + this.ballSize >= this.blocks[i].top &&
                this.ballPosY <= this.blocks[i].bottom
            ) {
                return i;
            }
        }

        return -1;
    }

    /**
     * Did the ball hit the paddle from the top? If so, return the location of the collision from the left edge. If not -1
     * @returns {number}
     */
    private paddleHit() : number {
        if (this.ballPosX + this.ballSize >= this.paddlePos &&
            this.ballPosX <= this.paddlePos + this.paddleWidth &&
            // current pos is on or below the paddle
            this.ballPosY + this.ballSize >= window.innerHeight - this.paddleFromBottom - this.paddleHeight &&
            // last position was above the paddle
            this.ballPosY - this.ballDirY < window.innerHeight - this.paddleFromBottom - this.paddleHeight
        ) {
            return this.ballPosX - this.paddlePos;
        }

        return -1;
    }

    private removeBlock(i : number) : void {
        this.blocks[i].$elem.addClass('transparent');
        this.blocks.splice(i, 1);

        if (!this.blocks.length) {
            this.gameWon = true;
        }
    }
}
