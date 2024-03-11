let maxloop = 4, numloop = 0, extPathPoints, flux = [], 
    dur = 100, durMin = 500, durMax = 30000;
function playScenario(nom){
    switch (nom) {
        case 'transformeCycleSemiose':
            //rotation de l'image
            let n = d3.select("#g558"), bb = n.node().getBBox(),
                nP = d3.select("#rect17").node().getBBox(),
                nT = d3.select("#g557").node().getBBox(),
                nodes = ['#g557','#g13','#g16','#g17','#g18','#g19','#g20'
                    ,'#rect21','#rect22','#rect23','#rect24'
                    ,'#rect53','#rect54','#rect55','#g23','#path55','#rect25','#g4'
                ];

            extPathPoints = [
                {'x':{'min':nP.x+nP.width,'max':nP.x},'y':{'min':nT.y+nT.height,'max':nT.y+nT.height}},
                {'x':{'min':nP.x,'max':nP.x},'y':{'min':nP.y+5,'max':nP.y-nP.height+5}},
                {'x':{'min':1396,'max':1450},'y':'y-1'},
                {'x':'x-2','y':{'min':580,'max':720}},
                {'x':{'min':nP.x+nP.width,'max':nP.x},'y':'y-3'},
                {'forme':'spirale','minT':1,'maxT':10,'minR':0.2,'maxR':4},
                {'x':'x-0-4','y':'y-0-4'},
                {'x':{'min':1664,'max':1720},'y':'y-0-3'},
                {'x':{'min':nP.x+nP.width-10,'max':nP.x+nP.width-10},'y':'y-0-1'},
                {'x':{'min':nP.x+nP.width,'max':nP.x},'y':{'min':nT.y+nT.height,'max':nT.y+nT.height}}
            ];
                           
            n.transition()
                .duration(dur)
                .attr('transform',"rotate(180 "+(bb.x+(bb.width/2))+" "+(bb.y+(bb.height/2))+")")
                .on('end', function(){replaceParts(nodes);});                    

        
            //agrandissement du pouvoir d'agir
            d3.select('#rect18')
                .transition()
                .duration(dur)
                .delay(dur*nodes.length)
                .attr('height', 182)
                .attr('y', 714).on('end', showFlux);

            break;
    
        default:
            break;
    }
}
function replaceParts(nodes){
    //affichage des nouveaux concepts et supression des lignes
    nodes.forEach((g,i)=>{
        d3.select(g)
            .transition()
            .duration(dur)
            .delay(dur*(i+1))
            .style("opacity", 1);
    })	    
}

function showFlux(){
    numloop++;    
    if(maxloop<numloop)return;
    //ajoute les path de flux aléatoires
    let nb = d3.randomInt(1, 10)()
    for (let index = 0; index < nb; index++) {

        let paths = getAleaPath(extPathPoints),
            c = d3.interpolateInferno(Math.random());
        d3.select("#g558").selectAll('.fluxPath').data(paths).enter()
            .append('path')  
            .attr('d', d=>d.d)
            .attr('id', (d,i)=>{
                d.id = 'fluxPath_'+numloop+'_'+index+'_'+i;
                return d.id;
                })
            .attr('class',d=>'fluxPath'+d.type)
            .attr('fill','none')
            .attr('stroke', c)
            .attr('stroke-opacity',0)
            .attr('stroke-width', 2)
            .attr('transform',d=>{
                return d.type=='spirale'?`translate(${d.prev[0]},${d.prev[1]})`:''
            })
            .transition()
                .duration(d=>d.dur)
                .delay(d=>d.delay)
                .ease(d3.easeLinear)
                .attr('stroke-opacity',0.3)
                .attrTween("stroke-dasharray", function() {
                    const length = this.getTotalLength();
                    return d3.interpolate(`0,${length}`, `${length},${length}`);
                })
                .on('end', d=>{
                    console.log('end draw '+d.id)
                    d3.select('#'+d.id).transition()
                        .duration(d3.randomInt(durMin, durMax)())
                        .delay(d3.randomInt(durMin, durMax)())
                        .style("opacity", 0).on('end',d=>{
                            console.log('end cache '+d.id)
                            showFlux();
                        });
                });
    }
                
}
function getAleaPath(points){
    let paths=[], arrP = [], ap = [], prev, dur=[], spiT, spiR;
    points.forEach((p,i)=>{
        if(p.forme){
            switch (p.forme) {
                case 'spirale':
                    //récupére la position précédente                    
                    prev = ap[i-1];
                    //enregistre le chemin précédent
                    dur.push(d3.randomInt(durMin, durMax)());
                    paths.push({'type':'curve','delay':0
                        , 'dur':dur[dur.length-1]
                        ,'d':d3.line().curve(d3.curveBasis)(ap)});
                    arrP.push(ap);
                    //calcule une spirale aléatoire
                    spiT = d3.randomInt(p.minT, p.maxT)()*6;
                    spiR = Math.random(p.minR, p.maxR);
                    ap = Array.from({ length: spiT }, (_, i) => [
                        (Math.PI / 3) * i, // angle (in radians)
                        spiR * i // radius
                      ]);
                    //retourne au centre
                    ap.push([0,0]);
                    //enregistre le chemin pour la spirale
                    dur.push(d3.randomInt(durMin, durMax)());
                    paths.push({'type':'spirale','delay':dur[dur.length-2]
                        , 'dur':dur[dur.length-1]
                        ,'d':d3.lineRadial().curve(d3.curveBasis)(ap),'prev':prev});
                    arrP.push(ap);
                    ap=[];
                break;
            }
        }else{
            let rx=p.x.min ? false : p.x.split('-'), 
                ry=p.y.min ? false : p.y.split('-'),             
            x = p.x.min ? d3.randomInt(p.x.min, p.x.max)() 
                : rx.length == 3 ? arrP[rx[1]][rx[2]][0] : ap[rx[1]][0],
            y = p.y.min ? d3.randomInt(p.y.min, p.y.max)() 
                : ry.length == 3 ? arrP[ry[1]][ry[2]][1] : ap[ry[1]][1];
            ap.push([x,y]);
        }
    });
    dur.push(d3.randomInt(durMin, durMax)());
    paths.push({'type':'curve','delay':dur[dur.length-3]+dur[dur.length-2]
        , 'dur':dur[dur.length-1]
        ,'d':d3.line().curve(d3.curveBasis)(ap)});
    return paths;
}
