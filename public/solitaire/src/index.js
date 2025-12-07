const gameEl = document.getElementById('js-solitaire');
const dealPileEl = document.getElementById('js-deck-pile');
const dealEl = document.getElementById('js-deck-deal');
const upperContainerEl = document.getElementById('js-upper');
const deskContainerEl = document.getElementById('js-board');
const deckPileEl = document.getElementById('js-deck-pile');

const cardWidth = 71;
const cardHeight = 96;
const state = {
    // clubs (♣), diamonds (♦), hearts (♥) and spades (♠)
    types: ['c', 'd', 'h', 's'],
    // 0 (black), 1 (red)
    colors: {'c': 0, 'd': 1, 'h': 1, 's': 0},
    cards: [
        // { el: null, type: 's', number: 0, facingUp: false }, {...}
    ],
    // dealer deck
    deal: {
        pile: {
            el: null,
            cards: [/* 0, 1, ... */]
        },
        deal: {
            el: null,
            cards: [/* 0, 1, ... */]
        },
    },
    // finish deck
    finish: [
        // { el: null, cards: [ 0, 1, ... ] }, {...}
    ],
    // playing desk
    desk: [
        // { el: null, cards: [ 0, 1, ... ]}, {...}
    ],
    // move target
    target: null,
    // moving
    moving: {
        card: {},
        element: null,
        index: -1,
        capture: false,
        container: {
            cards: [/* 0, 1, ... */]
        },
        target: null,
        origin: {},
        offset: {
            x: 0,
            y: 0,
        },
        destinations: []
    }
};

const DECK_STORAGE_KEY = "solitaireDeckBack";
let currentDeckBack = null;

const setDeckBack = (backStyleIndex, { persist = false } = {}) => {
    const clamped = Math.max(1, Math.min(12, Math.floor(backStyleIndex)));
    document.body.style.setProperty(
        "--background-position-facing-down",
        `${cardWidth * -(clamped - 1)}px ${cardHeight * -4}px`
    );
    currentDeckBack = clamped;
    if (persist) {
        try {
            localStorage.setItem(DECK_STORAGE_KEY, String(clamped));
        } catch (e) {
            // ignore storage errors
        }
    }
};

const loadSavedDeckBack = () => {
    try {
        const stored = parseInt(localStorage.getItem(DECK_STORAGE_KEY), 10);
        if (Number.isFinite(stored)) return stored;
    } catch (e) {
        return null;
    }
    return null;
};

let deckDialog = null;
const closeDeckDialog = () => {
    if (deckDialog) {
        deckDialog.remove();
        deckDialog = null;
    }
};

const showDeckChooser = () => {
    if (deckDialog) {
        closeDeckDialog();
        return;
    }
    const DECK_OPTIONS = [
        "Blue Diamonds",
        "Red & Blue",
        "Green & Blue",
        "Robot",
        "Roses",
        "Vines",
        "Blue Vines",
        "Clown Fish",
        "Ocean",
        "Seashell",
        "Spooky Castle",
        "Beach"
    ];
    deckDialog = document.createElement("div");
    deckDialog.className = "deck-dialog";
    deckDialog.addEventListener("click", (e) => {
        if (e.target === deckDialog) closeDeckDialog();
    });

    const panel = document.createElement("div");
    panel.className = "deck-dialog__panel";

    const title = document.createElement("div");
    title.className = "deck-dialog__title";
    title.textContent = "Choose Deck Back";

    const controls = document.createElement("div");
    controls.className = "deck-dialog__controls";
    const label = document.createElement("label");
    label.textContent = "Deck back:";
    label.style.display = "block";
    label.style.marginBottom = "4px";

    const select = document.createElement("select");
    select.className = "deck-dialog__select";
    DECK_OPTIONS.forEach((name, idx) => {
        const opt = document.createElement("option");
        opt.value = idx + 1;
        opt.textContent = `${idx + 1}: ${name}`;
        select.appendChild(opt);
    });
    select.value = currentDeckBack || 1;

    controls.appendChild(label);
    controls.appendChild(select);

    const actions = document.createElement("div");
    actions.className = "deck-dialog__actions";

    const applyBtn = document.createElement("button");
    applyBtn.type = "button";
    applyBtn.textContent = "Apply";
    applyBtn.addEventListener("click", () => {
        const back = parseInt(select.value, 10) || 1;
        setDeckBack(back);
        closeDeckDialog();
    });

    const saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.textContent = "Save Default";
    saveBtn.addEventListener("click", () => {
        const back = parseInt(select.value, 10) || 1;
        setDeckBack(back, { persist: true });
        closeDeckDialog();
    });

    const randomBtn = document.createElement("button");
    randomBtn.type = "button";
    randomBtn.textContent = "Random";
    randomBtn.addEventListener("click", () => {
        setDeckBack(Math.floor(Math.random() * 12) + 1);
        closeDeckDialog();
    });

    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.textContent = "Cancel";
    cancelBtn.addEventListener("click", closeDeckDialog);

    actions.appendChild(applyBtn);
    actions.appendChild(saveBtn);
    actions.appendChild(randomBtn);
    actions.appendChild(cancelBtn);

    panel.appendChild(title);
    panel.appendChild(controls);
    panel.appendChild(actions);
    deckDialog.appendChild(panel);
    document.body.appendChild(deckDialog);
};

const getCard = index => state.cards[index];

const faceUp = card => {
    state.cards[card].facingUp = true;
    requestAnimationFrame(() => {
        state.cards[card].el.classList.add('card--front');
        state.cards[card].el.classList.remove('card--back');
    });
};

const faceDown = card => {
    state.cards[card].facingUp = false;
    state.cards[card].el.classList.remove('card--front');
    state.cards[card].el.classList.add('card--back');
};

const faceUpLastOnDesk = index => {
    const card = getLastOnDesk(index);
    if (card !== null) {
        faceUp(card);
    }
};

const appendToCard = (target, card) => {
    state.cards[target].el.appendChild(
        state.cards[card].el
    )
};

const appendToDesk = (desk, card) => {
    state.desk[desk].el.appendChild(
        state.cards[card].el
    )
};

const getLastOnDesk = desk => {
    const l = state.desk[desk].cards.length;
    if (l > 0) {
        return state.desk[desk].cards[l - 1];
    }
    return null;
};

const getLastOnPile = (pile, index) => {
    const l = state[pile][index].cards.length;
    if (l > 0) {
        const card = state[pile][index].cards[l - 1];
        return state.cards[card];
    }
    return {};
};

const getCardLocation = card => {
    for (let i = 0; i < 7; i++) {
        const index = state.desk[i].cards.indexOf(card);
        if (index > -1) {
            return {
                location: 'desk',
                pile: i,
                index: index
            }
        }
    }

    for (let i = 0; i < 4; i++) {
        const index = state.finish[i].cards.indexOf(card);
        if (index > -1) {
            return {
                location: 'finish',
                pile: i,
                index: index
            }
        }
    }

    for (let i of ['deal', 'pile']) {
        const index = state.deal[i].cards.indexOf(card);
        if (index > -1) {
            return {
                location: 'deal',
                pile: i,
                index: index
            }
        }
    }
    // debugger;
    // 'Card not found!';
};

const getSubCards = card => {
    const { location, pile, index } = getCardLocation(card);

    return state[location][pile].cards.filter(
        (elem, i, array) => array.indexOf(elem) > index
    );
};

const getPile = (pile, index) => {
    return state[pile][index];
};

const moveCardTo = (dest, i, card) => {
    const {
        location,
        pile,
        index
    } = getCardLocation(card);

    const moving = state[location][pile].cards.filter(
        (elem, i, array) => array.indexOf(elem) >= index
    );

    // remove from source
    state[location][pile].cards = state[location][pile].cards.filter(
        (elem, i, array) => moving.indexOf(elem) === -1
    );

    // append to destination
    state[dest][i].cards = state[dest][i].cards.concat(moving);

    // console.log(state);
};

const canBePlacedOnCard = (child, parent) => {
    const { type, number } = getCard(child);
    const {
        type: parentType,
        number: parentNumber
    } = getCard(parent);
    return (
        (parentNumber - 1) === number &&
        state.colors[parentType] !== state.colors[type]
    );
};

const placeCardTo = (dest, index, card) => {
    function remove(array, element) {
        const index = array.indexOf(element);

        if (index !== -1) {
            array.splice(index, 1);
        }
    }
    state[dest][index].cards.push(card);
    remove(state.deal.pile.cards, card);
};

function dealCards() {
    let card = 0;
    for (let i = 0; i < 7; i++) {
        for (let j = i; j < 7; j++) {
            const last = getLastOnDesk(j);
            if (last !== null) {
                appendToCard(last, card)
            } else {
                appendToDesk(j, card);
            }

            placeCardTo('desk', j, card);

            if (j === i) {
                faceUp(card);
            }
            card++;
        }
    }
}

function shuffleInPlace(a) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
}

function resetGame() {
    // clear decks
    for (let i = 0; i < 7; i++) {
        state.desk[i].cards = [];
    }
    for (let i = 0; i < 4; i++) {
        state.finish[i].cards = [];
    }
    state.deal.pile.cards = [];
    state.deal.deal.cards = [];

    // shuffle cards
    shuffleInPlace(state.cards);

    // re-assign indexes
    requestAnimationFrame(() => {
        for (let i = 0, l = state.cards.length; i < l; i++) {
            const { facingUp, el } = state.cards[i];
            state.deal.pile.cards.push(i);

            el.onpointerdown = captureMove(i);
            el.onpointerup = releaseMove;
            el.onclick = handleClick(i);

            if (facingUp) {
                faceDown(i);
            }
            dealPileEl.appendChild(el);
        }
        dealCards();
    });
}

const handleClick = index => event => {
    event.stopPropagation();
    const { el, facingUp } = getCard(index);

    if (state.moving.capture) return;
    releaseMove();

    if (facingUp) {
        const { location, pile } = getCardLocation(index);

        if (location === 'deal' && pile === 'deal') {
            const {
                el: lastEl
            } = getLastOnPile('deal', 'deal');
            if (el !== lastEl) return;
        }

        const destinations = getAvailableDestinations(index, true);

        if (destinations.length > 0) {
            const {
                target,
                el: targetEl
            } = destinations[0];

            const {
                dest: destTarget,
                pile: pileTarget,
                card: cardTarget
            } = target;

            moveCardTo(destTarget, pileTarget, cardTarget);

            // face up last cards on desk
            if (location === 'desk') {
                faceUpLastOnDesk(pile);
            }
            targetEl.appendChild(el);
        } else {
            return;
        }
        gameFinish();
    } else {
        // is on deal deck
        const { location, pile } = getCardLocation(index);
        if (location === 'deal' && pile === 'pile') {
            const max = state.deal.pile.cards.length - 1;
            const min = Math.max(-1, max - 3);

            for (let i = max; i > min; i--) {
                const card = state.deal.pile.cards[i];
                const { el } = getCard(card);
                faceUp(card);
                moveCardTo('deal', 'deal', card);
                dealEl.appendChild(el);
            }
        }
    }
};

function restartDeal() {
    state.deal.pile.cards = state.deal.deal.cards;
    state.deal.deal.cards = [];

    for (const card of state.deal.pile.cards) {
        const { el } = getCard(card);
        faceDown(card);
        deckPileEl.appendChild(el);
    }
}

function getPointerPosition(event) {
    return {
        x: event.pageX,
        y: event.pageY
    };
}

const handleMove = event => {
    if (state.moving.capture) {
        const el = state.moving.element;
        const { x, y } = getPointerPosition(event);

        el.style.left = `${x - state.moving.offset.x}px`;
        el.style.top = `${y - state.moving.offset.y}px`;
    }
};

const startMovingPosition = event => {
    const el = state.moving.element;
    const { x, y } = getPointerPosition(event);
    const { top, left } = el.getBoundingClientRect();
    el.classList.add('card--moving');

    state.moving.offset = {
        x: x - left,
        y: y - top,
    };

    el.style.left = `${x - state.moving.offset.x}px`;
    el.style.top = `${y - state.moving.offset.y - 5}px`;
};

let moving;
const captureMove = index => event => {
    event.preventDefault();
    event.stopPropagation();
    const { el, facingUp } = getCard(index);
    if (facingUp) {
        const { location, pile } = getCardLocation(index);
        if (location === 'deal' && pile === 'deal') {
            const { el: lastEl } = getLastOnPile('deal', 'deal');
            if (el !== lastEl) {
                return false;
            }
        }
        moving = setTimeout(() => {
            state.moving.element = event.target;
            state.moving.capture = true;
            state.moving.index = index;
            state.moving.card = getCard(index);
            state.moving.origin = getCardLocation(index);

            startMovingPosition(event);

            const destinations = getAvailableDestinations(index);
            state.moving.destinations = destinations;

            for (const dest of destinations) {
                dest.el.classList.add('finish-dest');
            }

            for (let i = 0, l = destinations.length; i < l; i++) {
                const { top, left, width, height } = destinations[i].el.getBoundingClientRect();
                state.moving.destinations[i].offset = {
                    top: top,
                    left: left,
                    width: width,
                    height: height,
                }
            }

            // console.log(state.moving.destinations);
        }, 200);
    }
};

const dropCard = (x, y) => {
    for (const destination of state.moving.destinations) {
        const { width, height, left, top } = destination.offset;
        destination.el.classList.remove('finish-dest');
        if (
            (x > left && x < left + width) &&
            (y > top && y < top + height)
        ) {
            const { dest, pile, card } = destination.target;
            moveCardTo(dest, pile, card);

            destination.el.appendChild(state.moving.element);

            // check game finish
            gameFinish();

            // face up last on desk
            const {
                location: originLocation,
                pile: originPile
            } = state.moving.origin;

            if (originLocation === 'desk') {
                faceUpLastOnDesk(originPile);
            }
        }
    }
};

let release;
const releaseMove = event => {
    clearTimeout(moving);
    clearTimeout(release);
    if (state.moving.capture) {
        release = setTimeout(() => {
            const { x, y } = getPointerPosition(event);
            requestAnimationFrame(() => {
                dropCard(x, y);

                state.moving.element.classList.remove('card--moving');
                state.moving.element.style.left = '';
                state.moving.element.style.top = '';
                state.moving.element = null;
                state.moving.capture = false;
                // console.log('release');
            });
        }, 100);
    }
};

const getAvailableDestinations = (index, first = false) => {
    const { type, number } = getCard(index);
    const destinations = [];
    if (number === 1) { // aces
        // finish pile
        for (let i = 0; i < 4; i++) {
            const { cards, el} = getPile('finish', i);
            if (cards.length === 0) {
                destinations.push({
                    el: el,
                    target: {
                        dest: 'finish',
                        pile: i,
                        card: index
                    }
                });

                if (first) return destinations;
            }
        }
    }
    // other cards
    // move to finish pile
    const subCards = getSubCards(index);
    if (!subCards.length > 0) {
        for (let i = 0; i < 4; i++) {
            const l = state.finish[i].cards.length;
            if (l + 1 === number) {
                const {
                    type: lastType
                } = getLastOnPile('finish', i);

                if (lastType === type) {
                    destinations.push({
                        el: state.finish[i].el,
                        target: {
                            dest: 'finish',
                            pile: i,
                            card: index
                        }
                    });
                    if (first) return destinations;
                    break;
                }
            }
        }
    }
    // desk pile
    for (let i = 0; i < 7; i++) {
        const last = getLastOnDesk(i);
        if (last !== null) {
            if (canBePlacedOnCard(index, last)) {
                destinations.push({
                    el: state.cards[last].el,
                    target: {
                        dest: 'desk',
                        pile: i,
                        card: index
                    }
                });
                if (first) return destinations;
            }
        } else { // empty desk, accepts only kings
            if (number === 13) { // kings
                destinations.push({
                    el: state.desk[i].el,
                    target: {
                        dest: 'desk',
                        pile: i,
                        card: index
                    }
                });
                if (first) return destinations;
            }
        }
    }
    return destinations;
};


const gameFinish = () => {
    // game finish check
    for (let i = 3; i >= 0; i--) {
        const l = state.finish[i].cards.length;
        if (l < 13) return;
    }

    win();
};

const spritesheetImage = document.createElement('img');
spritesheetImage.src = "./src/spritesheet.png";

const win = () => {
    const boundingRect = gameEl.getBoundingClientRect();
    const canvas = document.createElement('canvas');
    canvas.style.position = 'absolute';
    canvas.width = boundingRect.width;
    canvas.height = boundingRect.height;
    gameEl.appendChild(canvas);

    const context = canvas.getContext('2d');
    let card = 52;
    const particles = [];

    const drawCard = (x, y, spriteX, spriteY) => {
        context.drawImage(
            spritesheetImage,
            spriteX,
            spriteY,
            cardWidth,
            cardHeight,
            x,
            y,
            cardWidth,
            cardHeight
        );
    };

    const Particle = function (id, x, y, sx, sy) {
        if (sx === 0) sx = 2;
        const spriteX = Math.floor(id / 4) * cardWidth;
        const spriteY = ( id % 4 ) * cardHeight;

        // initial position of the card
        drawCard(x, y, spriteX, spriteY);

        this.update = () => {
            x += sx;
            y += sy;

            // is particle out of canvas
            if (x < -cardWidth || x > (canvas.width + cardWidth)) {
                const index = particles.indexOf(this);
                particles.splice(index, 1);
                return false;
            }

            // bounce from floor
            if (y > canvas.height - cardHeight) {
                y = canvas.height - cardHeight;
                sy = -sy * 0.85;
            }
            sy += 0.98;

            drawCard(
                Math.floor(x),
                Math.floor(y),
                spriteX,
                spriteY
            );
            return true;
        };
    };

    const throwCard = (x, y) => {
        if (card < 1) return;
        card--;
        const particle = new Particle(
            card,
            x,
            y,
            Math.floor(Math.random() * 6 - 3) * 2,
            -Math.random() * 16
        );

        // const particle = new Particle(card, x, y, 0, 0);
        particles.push(particle);
    };

    let throwInterval = [];
    for (let i = 0; i < 4; i++) {
        const { left, top } = state.finish[i].el.getBoundingClientRect();
        throwInterval[i] = setInterval(function () {
            throwCard(left - boundingRect.left, top - boundingRect.top);
        }, 1000);
        // throwCard(left - boundingRect.left, top - boundingRect.top);
    }

    const updateInterval = setInterval(function () {
        let i = 0, l = particles.length;
        while (i < l) {
            particles[i].update() ? i++ : l--;
        }
        // clearInterval(updateInterval)
    }, 1000 / 60);

    function removeAnimation(event) {
        event.preventDefault();
        clearInterval(updateInterval);
        for (let i = 0; i < 4; i++) {
            clearInterval(throwInterval[i]);
        }
        canvas.parentNode.removeChild(canvas);
        document.removeEventListener('click', removeAnimation)
    }
    document.addEventListener('click', removeAnimation, false);
};

function initSolitaire() {
    const saved = loadSavedDeckBack();
    const backStyleIndex = Number.isFinite(saved) ? saved : Math.floor(Math.random() * 12) + 1;
    setDeckBack(backStyleIndex);

    // create all cards
    for (let i = 0; i < 4; i++) {
        for (let j = 1; j <= 13; j++) {
            const el = document.createElement('div');
            el.classList.add(
                'card',
                `card--${state.types[i]}-${j}`,
                'card--back'
            );
            el.style.setProperty(
                "--background-position-facing-up",
                `${cardWidth * -(j - 1)}px ${cardHeight * -i}px`
            );


            state.cards.push({
                el: el,
                type: state.types[i],
                number: j,
                facingUp: false
            });
        }
    }

    // create aces decks
    for (let i = 0; i < 4; i++) {
        const el = document.createElement('div');
        el.classList.add(
            'aces',
            `aces--${i}`
        );
        state.finish.push({
            el: el,
            cards: []
        });
        upperContainerEl.appendChild(el);
    }

    // create desk decks
    for (let i = 0; i < 7; i++) {
        const el = document.createElement('div');
        el.classList.add(
            'seven',
            `seven--${i}`
        );
        state.desk.push({
            el: el,
            cards: []
        });
        deskContainerEl.appendChild(el);
    }

    dealPileEl.onclick = restartDeal;
    window.onpointermove = handleMove;
    window.onpointerup = releaseMove;

    resetGame();
}

window.onload = initSolitaire;
window.resetGame = resetGame;
window.setDeckBack = setDeckBack;
window.showDeckChooser = showDeckChooser;
