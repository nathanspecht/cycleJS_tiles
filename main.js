const {div, makeDOMDriver} = CycleDOM;
const isolate = CycleIsolate;
const NUM_TILES = 5;

function intent(DOMSource, container) {
  var tileMouseDown$ = DOMSource.select('.tile').events('mousedown'),
    tileContainerMouseMove$ = container.events('mousemove'),
    tileContainerMouseUp$ = container.events('mouseup'),
    tileContainerMouseLeave$ = container.events('mouseleave'),

    tileContainerMouseUpOrLeave$ = 
      Rx.Observable.merge(
        tileContainerMouseUp$,
        tileContainerMouseLeave$.
          filter(event => "#" + event.target.id === container.namespace[0])
      ),
    
    coord$ = 
      tileMouseDown$.
        concatMap((contactPoint) => {
          return tileContainerMouseMove$.
            takeUntil(tileContainerMouseUpOrLeave$).
            map((mouseMoveEvent) => {
              return {
                pageX: mouseMoveEvent.pageX - contactPoint.offsetX,
                pageY: mouseMoveEvent.pageY - contactPoint.offsetY
              };
            });
        }),
    
    isSelected$ = 
      Rx.Observable.
        merge(
          tileMouseDown$,
          tileContainerMouseUpOrLeave$
        ).
        map(event => event.type === 'mousedown'),

    change$ = 
      Rx.Observable.combineLatest(
        coord$,
        isSelected$,
        (coord, isSelected) => { 
          return { 
            pageX: coord.pageX, 
            pageY: coord.pageY, 
            isSelected: isSelected
          };
        }
      );

  return change$;
}

function model(change$) {
  const init = { pageX: 0, pageY: 0, isSelected: false };
  return change$.startWith(init).map((change) => {
    return { 
      left: change.pageX + 'px', 
      top: change.pageY + 'px',
      backgroundColor: change.isSelected ? 'red' : 'blue',
      zIndex: change.isSelected ? 1000 : 0,
      boxShadow: change.isSelected ? '1px 1px 5px #888888' : 'none' 
    }; 
  });
}

function view(state$) {
  return state$.map(state =>
    div('.tile', { style: state })
  );
}

function Tile(sources, container) {
  const change$ = intent(sources.DOM, container);
  const state$ = model(change$);
  const vtree$ = view(state$);

  return {
    DOM: vtree$
  };
}

function main(sources) {
  const tileContainer = sources.DOM.select('#tile-container');

  const tileVTree$s = [];

  for (let i = 0; i < NUM_TILES; i++) {
    tileVTree$s.push(
      isolate(Tile)(sources, tileContainer).DOM
    );    
  }

  return {
    DOM: Rx.Observable.combineLatest(
      tileVTree$s, 
      (...args) => div('#tile-container', args)
    )
  };
}

const drivers = {
  DOM: makeDOMDriver('#app'),
}

Cycle.run(main, drivers);

