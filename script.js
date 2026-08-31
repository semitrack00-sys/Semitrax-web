(() => {
  const layer = document.getElementById('driverLayer');
  if (!layer) return;
  // 60 illustrative activity points tuned to the visible North America silhouette.
  const pts = [
    [31,29],[36,26],[40,32],[45,28],[50,31],[55,34],[60,31],[65,35],[70,38],[75,40],
    [34,42],[39,39],[44,43],[49,40],[54,44],[59,41],[64,45],[69,43],[74,46],[79,44],
    [35,51],[40,49],[45,52],[50,48],[55,53],[60,50],[65,54],[70,51],[75,55],[80,52],
    [37,60],[42,57],[47,61],[52,58],[57,63],[62,59],[67,62],[72,60],[77,64],[82,61],
    [40,68],[45,66],[50,70],[55,68],[60,72],[65,69],[70,73],[75,71],[80,69],[84,66],
    [47,77],[51,80],[55,78],[59,82],[63,80],[67,84],[60,88],[64,91],[69,87],[73,82]
  ];
  pts.forEach((p,i)=>{
    const d=document.createElement('span');
    d.className='driver-marker'+(i%5===0?' route-line':'');
    d.style.left=p[0]+'%'; d.style.top=p[1]+'%';
    d.style.animationDelay=(-(i%11)*0.17)+'s';
    layer.appendChild(d);
  });
})();
