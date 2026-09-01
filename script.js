(() => {
  const layer = document.getElementById("driverLayer");
  if (!layer) return;
  // Normalized coordinates tied to the 1280x1132 map image.
  // Because the overlay and image share the same aspect-ratio container,
  // markers stay anchored during desktop/tablet/mobile resizing.
  const pts=[[34.7,23.4],[41.6,17.8],[47.1,20.1],[54.9,22.3],[69.7,28.5],[75.1,31.8],[58.5,36.7],[86.9,40.0],[61.9,47.5],[69.4,49.7],[53.7,50.1],[63.0,50.9],[46.1,51.3],[80.9,51.2],[73.5,52.6],[89.5,53.8],[53.0,54.9],[63.4,55.1],[86.3,56.0],[78.9,56.6],[44.8,58.0],[67.6,59.3],[76.3,59.9],[73.1,60.4],[42.4,61.1],[85.5,61.3],[80.8,62.2],[52.5,63.3],[65.9,64.8],[43.8,65.0],[77.0,67.8],[63.3,67.4],[81.3,67.4],[53.3,68.8],[65.7,69.1],[70.3,69.3],[81.0,70.7],[74.1,70.9],[79.7,73.5],[61.5,74.7],[70.9,75.1],[55.0,75.5],[59.8,75.8],[59.2,76.5],[67.0,78.3],[69.3,79.4],[58.0,79.4],[61.6,79.7],[54.9,80.1],[80.7,81.4],[56.2,89.0],[56.2,92.1],[62.0,92.5],[59.4,93.7]];
  pts.forEach((p,i)=>{const d=document.createElement("span");d.className="driver-marker"+(i%6===0?" route-line":"");d.style.left=p[0]+"%";d.style.top=p[1]+"%";d.style.animationDelay=(-(i%13)*.14)+"s";layer.appendChild(d);});
})();