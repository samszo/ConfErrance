/*  
class pour générer des scénographies numériques
développé sur la base de slide.js cf. ziggy.jonsson.nyc@gmail.com

ATTENTION paramétrage des websockets
merci 
pour tutorial python websocket : https://websockets.readthedocs.io/en/stable/intro.html
pour paramétrage websocket apache : https://blog.crystalyx.net/utiliser-socket-io-et-les-websockets-avec-apache/
pour mise à jour libtool : https://www.unix.com/unix-for-dummies-questions-and-answers/244302-trying-install-libtool-source-newbie.html
pour la configuration du virtual host
ProxyPass "/pyskOralite/" ws://gapai.univ-paris8.fr:7272
ProxyPassReverse "/pyskOralite/" ws://gapai.univ-paris8.fr:7272        
pour lancer le serveur : python3.6 /var/python/websocket/wss_oralite.py
pour tester sur la console : python3.6 -m websockets ws://gapai.univ-paris8.fr:7272/

*/
class scenographie {
    constructor(params) {
        //propriétés génériques
        var me = this;
        this.id = params.id;
        this.idCont = params.idCont;
        this.svg = params.svg;
        this.delay = params.delay ? params.delay : 5000;
        this.hScene  = params.height ? params.height : 600;//hauteur de la scène
        this.wScene  = params.width ? params.width : 800;//largeur de la scène
        this.hGlobal;//hauteur globale du svg
        this.wGlobal;//largeur globale du svg
        this.hWindow;//hauteur de la fenêtre
        this.wWindow;//largeur de la fenêtre
        this.websocket;
        this.wsUrl = params.wsUrl ? params.wsUrl : 'ws://gapai.univ-paris8.fr/pyskOralite/';
        this.erpna = params.erpna ? params.erpna : false;//gestionnaire de l'api europeana
        this.autostart = false;
        this.scene = 0;
        this.nbAut = 1;
        this.nbSeq = 1;

        var slides={}, son, pSon, video, pVideo, objVideo, idAut, rects, keys;
        // Timer variables
        var timeoutHandle, now, startTime, isStarted = false, elapsedTime = 0, clock = Date, arrNav=[];
        var margin = {'top':10,'left':10,'rigth':10,'bottom':10,'interH':me.hScene,'interW':me.wScene},colorAut,colorSeq;

        this.init = function () {

            me.websocket = new WebSocket(me.wsUrl);

            if(me.websocket){
                me.websocket.onmessage = function(event) {
                    let data = JSON.parse(event.data);
                    switch (data.type) {
                        case 'state':
                            me.scene = data.slide;
                            idAut = data.auteur;
                            me.nextSlide();
                            break;
                        case 'users':
                            break;
                        default:
                            console.error( "unsupported event", data);
                    }
                };        
            }            
        }

        this.initScale = function(){
            //dimensionne le svg principal dans toute la fenêtre
            me.hGlobal=me.hScene*me.nbAut+margin.top+margin.bottom+((me.nbAut-1)*margin.interH)
            me.wGlobal=me.wScene*me.nbSeq+margin.left+margin.rigth+((me.nbSeq-1)*margin.interW)
            colorAut=d3.scaleSequential(d3["interpolateWarm"]).domain([0, me.nbAut-1]) 
            colorSeq=d3.scaleSequential(d3["interpolateCool"]).domain([0, me.nbSeq-1]);  
        }

        this.initSvg = function(){
            d3.select('#'+me.id).remove();
            me.svg = d3.select('#'+me.idCont).append('svg')
                .attr('id',me.id)
                .attr('preserveAspectRatio', null)
                .attr('viewBox', null)
                .attr('height',me.hGlobal)
                .attr('width',me.wGlobal); 
        }

        this.start = function () {

            //dimensionne le svg
            me.svg=d3.select("#"+me.id)
                .attr("preserveAspectRatio","xMidYMid meet")
                .attr("width",me.wWindow)
                .attr("height",me.hWindow-10);
            
            //prépare les IHM
            me.clear();
            me.setIHM();

            rects = me.svg.selectAll("rect")._groups[0];
            slides = [];
            for (let i=0;i<rects.length;i++) {
                let id = rects[i].id;
                if (id.slice(0,6)=='slide_') { 
                    slides[id.slice(6)]=rects[i] ;
                    rects[i].scale_x = d3.scaleLinear().range([rects[i].x.baseVal.value,rects[i].x.baseVal.value+rects[i].width.baseVal.value]).domain([0,1000]);
                    rects[i].scale_y = d3.scaleLinear().range([rects[i].y.baseVal.value,rects[i].y.baseVal.value+rects[i].height.baseVal.value]).domain([0,1000]);
                }
            }
            //ATTENTION au max scene
            let maxScene = 1000000;
            let reducer = function(arr){return (parseFloat(arr[0])*maxScene)+parseFloat(arr[1])+parseFloat(arr[2]);};
            keys = Object.keys(slides).sort(function(a, b){
                let arrA = a.split('_');
                console.log(arrA);
                let sumA = reducer(arrA);                
                console.log(sumA);
                let arrB = b.split('_');
                let sumB = reducer(arrB);
                return sumA - sumB;
            });
           slides.keys = keys;
            
            //ajoute un curseur sur les images avec un onclick
            me.svg.selectAll("image")
                .on("mouseover",function(d) {
                    if(this.getAttribute("onclick"))d3.select(this).style("cursor", "pointer");
                })
                .on("mouseout",function(d) {
                    if(this.getAttribute("onclick"))d3.select(this).style("cursor", "default");
                });    		
            //ajoute un curseur sur les textes avec un onclick
            me.svg.selectAll("text")
                .on("mouseover",function(d) {
                    if(this.getAttribute("onclick"))d3.select(this).style("cursor", "pointer");
                })
                .on("mouseout",function(d) {
                    if(this.getAttribute("onclick"))d3.select(this).style("cursor", "default");
                });    		
            //ajoute un curseur sur les g avec un onclick
           me.svg.selectAll("g")
                .on("mouseover",function(d) {
                    if(this.getAttribute("onclick"))d3.select(this).style("cursor", "pointer");
                })
                .on("mouseout", function(d) {
                    if(this.getAttribute("onclick"))d3.select(this).style("cursor", "default");
                });    		
            
            //cache les éléments à cacher
            me.svg.selectAll(".cache").style("opacity", 0);	    

            //met à jour le navigateur d'image s'il existe
            d3.select("#"+me.id+"numSlide")
                .attr("max",keys.length-1);
            d3.select("#"+me.id+"numSlide-max")
                .text(keys.length-1);
		
            //gestion des événements
            d3.select(window).on("keydown", function() {
                me.keyDown(d3.event.keyCode);
            })                
            //lance le minuteur
            me.resetTimer();		
            me.toggleTimer();

    		// Start with the first slide si aucun slide n'est en cours
            me.gereSocket({action: 'navigue', s: me.scene});
            //me.changeScene(me.scene);

        }

        this.keyDown = function(keyCode){

            console.log("Touche DEB : "+keyCode+" = "+me.scene+" : "+keys[me.scene]);
        
            //récupère l'élément pour gérer les attributes de navigation
            let rct = d3.select('#'+slides[keys[me.scene]].id);
            //vérifie si une video est en cours
            console.log('gereSocket:media-type='+rct.attr('media-type')+' currentTime='+objVideo.currentTime+' duration='+objVideo.duration+' -> '+rct.attr('duration'));
            if(rct.attr('media-type')=="video" && objVideo.currentTime != 0 && objVideo.currentTime < objVideo.duration)return;
            console.log('OK for next');

            //vérifie le changement d'auteur
            if(keyCode > 64 && keyCode < 92){
                //récupère le nouveau slide
                idAut = keyCode-65;
                var curSlide = keys[me.scene].split('_');
                var autSlide = idAut+'_'+curSlide[1]+'_'+curSlide[2];
                console.log("autSlide : "+autSlide);
                for (let index = 0; index < keys.length; index++) {
                    if(autSlide==keys[index]){
                        //gestion du websocket
                        me.scene=index; 
                        me.gereSocket({action: 'auteur',s:me.scene,a:idAut});
                    }  
                }
            }    

            switch (keyCode) {
                case 37: {
                    if (me.scene>0) {
                        me.scene=me.scene-1; 
                        me.gereSocket({action: 'navigue',s: me.scene});
                    };
                    break}
                case 39: {
                    if(me.scene<keys.length-1) {
                        me.scene++; 
                        me.gereSocket({action: 'navigue',s: me.scene});
                    };
                    break}
                case 36: {
                    me.scene = 0;
                    me.gereSocket({action: 'navigue',s: me.scene});
                    break}
                case 35: {
                    me.scene = keys.length -1; 
                    me.gereSocket({action: 'navigue',s: me.scene});
                    break}
            }
            console.log("Touche FIN : "+keyCode+" = "+me.scene+" : "+keys[me.scene]);
                
        }


        this.clear = function () {
            //supprime les élément de navigation
            d3.select("#"+me.id+"navig").remove();
            d3.select("#"+me.id+"divSon").remove();
            d3.select("#"+me.id+"divVideo").remove();            
        }

        this.setIHM = function () {
            //AJOUT du navigateur
            var nav = d3.select("body").append("div")
                .attr("id",me.id+'navig')
                .style("position",'absolute')
                .style("left",'10px')
                .style("bottom",'0px');
            nav.append("label")
                .attr("for",'numSlide')
                .text("Scene = ")
                .append("span")
                    .attr("id",me.id+'numSlide-value')
                    .text("...");
            nav.append("input")
                .attr("id",me.id+'numSlide')
                .attr("type",'range')
                .attr("max",'10')
                .attr("min",'0')
                .attr("value",'1')
                .attr("step",'1')
                .on("input", function() {
                    me.changeScene(this.value);	
                });
            nav.append("span")
                .text("38")
                .attr("id",me.id+'numSlide-max');

            //ajoute le lecteur de son
            son = d3.select("body").append("div")
                .attr("id",me.id+'divSon')
                .style("position",'absolute')
                .style("left",(me.gW/2)+'px')
                .style("bottom",(me.hScene/2)+'px')
                .style('display','none')
                .style('border-style','solid');
            son.append("div")
                .text("FERMER")
                .style("text-align",'center')
                .style("cursor", "pointer")
                .style("background-color","white")
                .on("click",function(d){
                    son.style('display','none');
                    document.getElementById(me.id+'playerSon').pause();
                })
            pSon = son.append("audio")
                .attr("id",me.id+'playerSon')
                .attr("autoplay",false)	
                .attr("controls",true);

            //ajoute le lecteur de vidéo
            video = d3.select("body").append("div")
                .attr("id",me.id+'divVideo')
                .style("position",'absolute')
                //.style("left",(gW/2)+'px')
                //.style("bottom",(gH/2)+'px')
                .style("height",'100%')
                .style("width",'100%')
                .style('display','none')
                .style('border-style','solid');
            pVideo = video.append("video")
                .attr("id",me.id+'playerVideo')
                .style("height",'100%')
                .style("width",'100%')
                .attr("autoplay",false)	
                .attr("controls",true)
                .html("Sorry, your browser doesn't support embedded videos.");
            objVideo = document.getElementById(me.id+"playerVideo");        
        }

        // Toggle timer state
        this.toggleTimer = function(){
            isStarted = !isStarted;
            if(isStarted){
                startTime = clock.now();
                me.tickInstant();
            }else {
                clearTimeout(timeoutHandle);
            }
        }


        this.resetTimer = function(){
            clearTimeout(timeoutHandle);
            isStarted = false;
            elapsedTime = now = startTime = 0;
            arrNav=[];
        }


        this.tickInstant = function(time) {
            if(time)elapsedTime=time;
            now = clock.now();
            elapsedTime = elapsedTime + now - startTime;
            startTime = now;	
            let n = Date.now();
            setTimeout(me.tickInstant, 1000 - n % 1000);
        }

        this.gereSocket = function(params){

            if(me.websocket){
                try {
                    //vérifie si le socket est ouvert
                    if(me.websocket.readyState==1)
                        me.websocket.send(JSON.stringify(params));
                    else me.nextSlide();
                } catch (error) {
                    console.log(error);
                    me.nextSlide();
                }
            }else{
                me.nextSlide()
            }			
        }

        this.nextSlide = function()  {
    
            //traitement de changement de slide
            me.clearVideo();
            me.clearAnimation();

            let vb = slides[keys[me.scene]].x.baseVal.value+" "+slides[keys[me.scene]].y.baseVal.value+" "+slides[keys[me.scene]].width.baseVal.value+" "+slides[keys[me.scene]].height.baseVal.value;
            me.svg.transition().duration(me.delay).attr("viewBox",vb);
    
            //vérification de la présence de vidéo
            let rct = d3.select('#'+slides[keys[me.scene]].id);
            if(rct.attr('media-type')=="video")me.joueVideo(rct);
            console.log("vb : "+vb);	
    
            //vérification de la présence d'un générateur
            let doc = document.getElementById('txt_'+keys[me.scene]);
            if(doc){
                let txt = d3.select('#txt_'+keys[me.scene]);
                if(txt.attr('generateur'))me.generateur(txt);
            }
    
            me.changeNavig(me.scene);
        }

    
        this.changeScene=function (numScene){
            // adjust the range text
            if(me.svg){
                me.scene = numScene;	
                me.nextSlide();
            }
        }
    
        this.changeNavig=function (numIma){
           // adjust the range text
           //console.log(numIma+" "+slide);
            d3.select("#"+me.id+"numSlide-value").text(numIma);
            d3.select("#"+me.id+"numSlide").property("value", numIma);
            arrNav.push({'numIma':numIma,'t':elapsedTime}); 	
        }
    
        this.showCache=function (id){
            d3.select("#"+id).style("opacity", 1);	
        }
    

        this.joueSon=function (url){
            son.style('display','block');
            pSon.attr('autoplay',true)
                .attr("src",url);	
        }
        this.joueVideo=function (obj){
            let bb = obj.node().parentNode.getBBox();
            video.style('display','block');
            video.style('width',me.wWindow+'px');
            video.style('height',me.hWindow+'px');
            //video.style('width',bb.width+'px');
            //video.style('height',bb.height+'px');
            //video.style('top',((me.hScene/2)+bb.y-(bb.height/2))+'px');
            //video.style('left',((me.wScene/2)+bb.x-(bb.width/2))+'px');
            video.style('bottom',0+'px');
            video.style('left',0+'px');
            pVideo.attr('autoplay',true)
                .attr("src",obj.attr('media-file'));
            if(obj.attr('media-size')=='Fullscreen' && !me.autostart)
                objVideo.requestFullscreen();

        }
        this.clearVideo=function (){
            video.style('display','none');
            document.getElementById(me.id+'playerVideo').pause();
        }
        this.clearAnimation=function (){
            d3.selectAll('.europeana').remove();
            if(me.erpna)me.erpna.flux=false;
        }
    
        this.generateur=function (n) {
            if(n.attr('generateur')=='getImageText')me.getImageText(n);
        }
        this.getImageText=function (txt) {
            if(me.erpna){
                me.erpna.flux=true;
                //transforme les span en images
                txt.selectAll('tspan').each(function(){
                    //me.erpna.findAleaImage(d3.select(this),setImageAnim);
                    me.erpna.findImages(d3.select(this),me.setImagesAnim);
                })	
            }
        }
        this.setImagesAnim=function (e, items){
            items.forEach(function(i){
                if(me.erpna.flux && i.type!='SOUND'){
                    me.setImageAnim(e, i);
                    //console.log(i.type);
                }
            });
        }

        this.export=function(){
            var svgData = $("#"+me.id)[0].outerHTML;
            var svgBlob = new Blob([svgData], {type:"image/svg+xml;charset=utf-8"});
            var svgUrl = URL.createObjectURL(svgBlob);
            var downloadLink = document.createElement("a");
            downloadLink.href = svgUrl;
            downloadLink.download = "oralite.svg";
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);    
        }

        this.import=function(fr){
            //fonctionnalité gérée par la page web
        }
    
        this.setImageAnim=function (e, item){
            //item vient d'europeana
            let imgSrc = item.edmPreview[0];
            //récupère la position du rectangle
            let idRect = e.attr('id').replace('txt','slide');
            let bb = d3.select('#'+idRect).node().getBBox();
            //ajoute l'image dans la scene avec une position aléatoire
            let aleaX = d3.randomUniform(bb.x, bb.x+bb.width);
            let aleaY = d3.randomUniform(bb.y, bb.y+bb.height);
            //dans une temporalité aléatoire
            let aleaTime = d3.randomUniform(3000, 6000);
    
            let img = d3.select("#"+svgId).append('image')
                    .attr('id',item.id)
                    .attr('class','europeana')
                    .attr('height',"0%")
                    .attr('x',aleaX())
                    .attr('y',aleaY())
                    .attr('xlink:href',imgSrc);
            //ajoute l'effet d'animation
            img.transition()
                    .duration(aleaTime())
                    .delay(aleaTime())
                    .on("start", function repeat() {
                            d3.active(this)
                                    .attr("height", "100%")
                                    .attr("x", bb.x)
                                    .attr("y", bb.y)
                            .transition()
                                    .attr("height", "0%")
                                    .attr("x", aleaX())
                                    .attr("y", aleaY())
                            .transition()
                                    .on("start", repeat);
                    });                
        }
        
        this.genererSlide = function(nbA, nbS){
            
            me.nbAut = nbA;
            me.nbSeq = nbS;

            //Générer le tableau des slides
            var arrSlide=[];
            for (let i = 0; i < me.nbAut; i++) {
                for (let j = 0; j < me.nbSeq; j++) {
                    arrSlide.push({'aut':i,'seq':j});
                }                
            }

            me.initScale();
            me.clear();
            me.initSvg();

            //Générer les slides
            var gSlides = me.svg.selectAll(".slide").data(arrSlide).enter()
                .append('g')
                .attr('class',"slide")
            gSlides.append('rect')
                .attr('height',me.hScene)
                .attr('width',me.wScene)
                .attr('id',function(d){
                    d.w = me.wScene;
                    d.h = me.hScene;
                    d.id = "slide_"+d.aut+"_"+d.seq+"_0";
                    return d.id;})
                .attr('style','fill-opacity:0.3;stroke-width:4')
                .style('fill',function(d){
                    var c = colorSeq(d.seq);
                    return c;
                })
                .style('stroke',function(d){
                    var c = colorAut(d.aut);
                    return c;
                })
                .attr('x',function(d){
                    d.x = d.seq == 0 ? margin.left : margin.left+(d.seq*me.wScene)+(d.seq*margin.interW);
                    return d.x;
                })
                .attr('y',function(d){
                    d.y = d.aut == 0 ? margin.top : margin.top+(d.aut*me.hScene)+(d.aut*margin.interH);
                    return d.y;
                });
            gSlides.append('text')
                .attr("x", function(d) { return d.x + me.wScene/2; })
                .attr("y", function(d) { return d.y + me.hScene/2; })
                .attr("text-anchor", "middle")
                .text(function(d) { return "auteur = "+String.fromCharCode(65+d.aut).toLowerCase(); });                    
            gSlides.append('text')
                .attr("x", function(d) { return d.x + me.wScene/2; })
                .attr("y", function(d) { return d.y + me.hScene/2 + 20; })
                .attr("text-anchor", "middle")
                .text(function(d) { return "séquence = "+d.seq; });    
        }

        this.chargeOmkScenario = function(idItem){
            $.ajax({
                dataType: "json",
                url: "../api/items/"+idItem
            }).done(function( data ) {
                console.log(data);	
                //vérifie la présence d'un svg
                if(data["o:media"][0]["o:id"]){
                    //récupère le media
                    $.ajax({
                        dataType: "json",
                        url: "../api/media/"+data["o:media"][0]["o:id"]
                    }).done(function( media ) {
                        console.log(media);	
                        if(media["o:media_type"]=="image/svg+xml"){
                            //charge le svg
                            try {
                                //supprime le main svg existant
                                d3.select('#'+me.id).remove();
                                //charge le svg
                                let url = "../files/original/"+media["o:filename"];
                                d3.xml(url).mimeType("image/svg+xml").get(function(error, xml) {
                                    me.nbSeq = data["bibo:chapter"].length;
                                    me.nbAut = data["dcterms:contributor"].length;
                                    me.initScale();
                                    me.clear();
                                    d3.select('#'+me.idCont).node().append(xml.documentElement)
                                    me.svg = d3.select('#'+me.id)
                                        .attr('preserveAspectRatio', null)
                                        .attr('viewBox', null)
                                        .attr('height',me.hGlobal)
                                        .attr('width',me.wGlobal); 
                    
                                    if(me.autostart)me.start();
                                });
                            } catch (error) {
                                w2alert('Les données ne sont pas au bon format.');
                            }
                        }
                    }).error(function(e){
                        console.log(e);	
                    });          

                }
            }).error(function(e){
                console.log(e);	
            });                   
        }

        this.chargeOmkItems=function(lstAutItem){
            console.log(lstAutItem);
            
            //calcule du tableau des slides            
            var arrSlide=[];
            var i=0;
            me.nbSeq = 0;
            for (const a in lstAutItem.auteurs) {
                if(me.nbSeq < lstAutItem.auteurs[a].length)me.nbSeq=lstAutItem.auteurs[a].length;
                lstAutItem.auteurs[a].forEach(function(s){
                    let j = parseFloat(s.seq['oa:start'][0]['@value']);
                    arrSlide.push({'aut':(i+1),'autNom':a,'seq':j,'o':s});
                })
                i++;
            };            
            me.nbAut = i;

            me.initScale();
            me.clear();
            me.initSvg();

            //Générer les slides
            var gSlides = me.svg.selectAll(".slide").data(arrSlide).enter()
                .append('g')
                .attr('class',"slide")
            gSlides.append('rect')
                .attr('height',me.hScene)
                .attr('width',me.wScene)
                .attr('id',function(d){
                    d.w = me.wScene;
                    d.h = me.hScene;
                    d.id = "slide_"+d.aut+"_"+d.seq+"_0";
                    return d.id;})
                .attr('style','fill-opacity:0.3;stroke-width:4')
                .style('fill',function(d){
                    var c = 'black';
                    return c;
                })
                .style('stroke',function(d){
                    var c = colorAut(d.aut);
                    return c;
                })
                .attr('x',function(d){
                    d.x = d.seq == 0 ? margin.left : margin.left+(d.seq*me.wScene)+(d.seq*margin.interW);
                    return d.x;
                })
                .attr('y',function(d){
                    d.y = d.aut == 0 ? margin.top : margin.top+(d.aut*me.hScene)+(d.aut*margin.interH);
                    return d.y;
                })
                .each(function(d){
                    //gestion des medias
                    //<rect duration="112" media-type="video" media-size="Fullscreen" ="center" ="http://www.samszo.univ-paris8.fr/IMG/mp4/seq_2_b.mp4" y="610" x="810" style="fill:#5e57cb;fill-opacity:0.3;stroke:#ee4395;stroke-width:4" id="slide_1_1_0" width="400" height="300"></rect>
                    var rect = d3.select(this);
                    d.o.medias.forEach(function(m){
                        if(m['o:media_type']=='video/mp4'){
                            rect.attr('media-type', 'video');
                            rect.attr('media-size', 'Fullscreen');
                            rect.attr('media-position', 'center');
                            rect.attr('media-file', m['o:original_url']);
                        }
                    });
                });
            gSlides.append('g')
                .each(function(d) { 
                    //création des médias
                    var g = d3.select(this);
                    d.o.medias.forEach(function(m){
                        console.log(m);
                        if(m['o:media_type']=='image/jpeg'){
                            g.append('image')
                                .attr("x", function(d) {return d.x;})
                                .attr("y", function(d) {return d.y;})
                                .attr('width',me.wScene)
                                .attr('height',me.hScene)
                                .attr('xlink:href',m['o:original_url'])                                                                
                        }
                        if(m['o:renderer']=='html'){
                            g.append('foreignObject')
                                .attr("x", d.x+margin.left)
                                .attr("y", d.y+margin.top)
                                .attr('width',me.wScene-margin.left-margin.rigth)
                                .attr('height',me.hScene-margin.top-margin.bottom)
                                .html(m.data.html)                                                                
                        }
                        
                    });
                });
            if(me.autostart)me.start();
        }            
        this.init();
    }
}
  


