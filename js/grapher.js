print = console.log;
stack = console.trace;

function Graph(div_id){
	this.constructor = function(){
		this.graphs = [];
		this.graphType = {
			line:0,
			gantt:1,
			max:2
		};
		this.initialized = false;
		this.div = document.getElementById(div_id);
		this.width = this.div.getBoundingClientRect().width;
		this.height = this.div.getBoundingClientRect().height;

		this.div_id = "graph-"+div_id;
		this.main_cont = d3.select("#" + div_id);
		this.graph_cont = this.main_cont.append("div").attr("id", this.div_id);

		// prop
		this.dataprop = {
			start:0, end:0, delta:0
		}
		this.grapharea = {
			width:this.width, height:this.height, top:0, left:0, right:0, bottom:0
		}
		this.zoomprop = {
			t:[0,0], sc:1
		}
		this.zoomTypes = {
			wheel: 0,
			select: 1,
			pan: 2
		}
		this.zoomtype = this.zoomTypes.wheel;
		this.datasize = 0;
		this.dragdata = {
			start: false,
			end: false
		}

		// Set up zoomimg
		this.d3zoom = d3.behavior.zoom();
		this.main_cont.call(this.d3zoom.on("zoom", ()=> {
			if(this.zoomtype == this.zoomTypes.wheel || (this.zoomtype == this.zoomTypes.pan && d3.event.sourceEvent.deltaY == undefined)){
				this.delayZoom();
			}else{
				this.d3zoom.translate(this.zoomprop.t);
				this.d3zoom.scale(this.zoomprop.sc);
			}
		}));

		this.setGUI();
	}

	this.setXTitle = function(val){
		this.div_xtitle.select(".center").html(val)
	}
	this.setTitle = function(val){
		this.div_title.select(".center").html(val)
	}

	this.addGraph = function(type){
		this.graphs.push(type);
		return this.graphs.length - 1;
	}

	this.initializeGraphs = function(){
		this.graph_divs = this.graph_cont.selectAll("div").data(this.graphs).enter()
			.append("div").style("width", "100%").style("height", (100/this.graphs.length)+"%")
			.attr("id",(d,i)=> this.div_id + "-" + i)
			.attr("class", "cus-subplot");

		for(var i = 0; i < this.graphs.length; i++){
			if(this.graphs[i] >= this.graphType.max) continue;
			var g;
			var id = this.div_id + "-" + i;

			switch(this.graphs[i]){
				case this.graphType.line:
					g = new sdLine(id, i);
					break;
				case this.graphType.gantt:
					g = new sdGantt(id, i);
					break;
				default:
					break;
			}
			g.plotoffset = {
				x:0,
				y:(this.height / this.graphs.length * i)
			}
			this.graphs[i] = g;
		}

		this.setMouseEffects();
	}

	this.getGraph = function(index){
		if(index < this.graphs.length){
			return this.graphs[index];
		}
		return -1;
	}

	this.setGUI = function(){
		// GUI container
		this.gui = this.main_cont.append("div").attr("class", "cus-gui").style("z-index", 999);

		// this.gui.append("div").attr("class", "hr");
		// this.gui.append("div").html("Control type: ");

		// Wheel btn
		this.gui.append("input").attr("type", "button").attr("value", "Wheel").attr("class", "zoomtype wheel selected")
			.on("click", () => {
				d3.selectAll(".zoomtype.selected").classed("selected", false);
				d3.selectAll(".zoomtype.wheel").classed("selected", true);
				d3.selectAll(".zoomtype.pan").classed("selected", false);
				this.zoomtype = this.zoomTypes.wheel;
			})
			.on("mouseover", ()=> this.gui_tip.show("Zoom with wheel, and pan by dragging"))
			.on("mouseleave", ()=> this.gui_tip.hide());

		// Select btn
		this.gui.append("input").attr("type", "button").attr("value", "Select").attr("class", "zoomtype select")
			.on("click", () => {
				d3.selectAll(".zoomtype.selected").classed("selected", false);
				d3.selectAll(".zoomtype.select").classed("selected", true);
				d3.selectAll(".zoomtype.pan").classed("selected", false);
				this.zoomtype = this.zoomTypes.select;
			})
			.on("mouseover", ()=> this.gui_tip.show("Zoom by selecting a section of the graph"))
			.on("mouseleave", ()=> this.gui_tip.hide());

		// Pan btn requires semouseeffects
		this.gui.append("input").attr("type", "button").attr("value", "Pan").attr("class", "zoomtype pan")
			.on("click", () => {
				d3.selectAll(".zoomtype.selected").classed("selected", false);
				d3.selectAll(".zoomtype.select").classed("selected", false);
				d3.selectAll(".zoomtype.pan").classed("selected", true);
				this.zoomtype = this.zoomTypes.pan;
			})
			.on("mouseover", ()=> this.gui_tip.show("Pan by dragging"))
			.on("mouseleave", ()=> this.gui_tip.hide());

		// Tip on hovering buttons
		this.gui_tip = this.gui.append("div").html("tip").attr("class", "hidden").style({
			"position":"absolute", "left" : 0, "transition": "0.3 ease",
			"top": "100%", "width":"100%", "text-align":"center", "color" : "grey"
		});
		this.gui_tip.show = (msg) => {
			this.gui_tip.html(msg);
			this.gui_tip.classed("hidden", false);
		}
		this.gui_tip.hide = () => {
			this.gui_tip.classed("hidden", true);
		}

		this.gui.append("div").attr("class", "hr");

		// Reset zoom btn
		this.gui.append("input").attr("type", "button").attr("value", "Zoom to fit")
			.on("click", () => {
				this.resetZoom();
			})
			.on("mouseover", ()=> this.gui_tip.show("Reset graphs to initial zoom"))
			.on("mouseleave", ()=> this.gui_tip.hide());

		// Titles
		this.div_title = this.main_cont.append("div").style("width", "100%").attr("class", "title");
		this.div_xtitle = this.main_cont.append("div").style("width", "100%").attr("class", "x title");
		this.div_title.append("h2").attr("class", "center"); this.div_xtitle.append("h3").attr("class", "center");
	}

	this.setMouseEffects = function(){
		// Mouse effect container
		this.interact_svg = this.main_cont.append("svg").attr("class", "mouse-over-effects")
			.attr("width", "100%").attr("height", "100%")
			.style("position", "absolute").style("top", 0).style("left", 0).style("z-index", 900);

		this.mouse_g = this.interact_svg.append("svg").append("g");
		this.mouse_g_drag_rect = this.mouse_g.append("svg:rect").attr("opacity", 0)
			.attr("height", "100%")
			.attr("width", "100%");

		this.mouse_g_rect = this.interact_svg.append("svg:rect").attr("opacity", 0)
			.attr("height", "100%")
			.attr("width", "100%");

		this.mousing_over = -1; // indicates which graph it's currently hovering
		this.mouse_g_rect
		.on("mousemove", ()=>{
			var pt = {x: d3.event.layerX, y: d3.event.layerY};

			// Checking mouseover/mouseleave
			var inGraph = false;

			this.graphs.forEach((g, i) => {
				if(this.isWithinGraph(i, pt)){
					if(this.mousing_over != -1) this.graphs[this.mousing_over].onMouseleave();
					g.onMouseover();
					this.mousing_over = i;
					inGraph = true;
				}
			});

			if(!inGraph && this.mousing_over != -1){
				this.graphs[this.mousing_over].onMouseleave();
				this.mousing_over = -1;
			}

			// Checking point/hovering effects
			this.graphs.forEach((g, i) => {
				if(this.isWithinGraph(i, pt)){
					var p = {x: d3.event.layerX, y: (d3.event.layerY - g.plotoffset.y)}
					g.onMousemove(p);
				}
			});

			// Checking drag
			if(this.dragdata.start && this.zoomtype == this.zoomTypes.select){
				this.mouse_g_drag_rect.attr("opacity", "0.3")
					.attr("width", Math.abs(pt.x - this.dragdata.start.x))
					.attr("height", this.grapharea.height)
					.attr("transform", "translate("+ Math.min(pt.x, this.dragdata.start.x) +","+ this.grapharea.top +")")
			}else{
				this.mouse_g_drag_rect.attr("opacity", "0")
			}
		})
		.on("click", ()=> {
			this.graphs.forEach((g, i) => {
				if(this.isWithinGraph(i, {x: d3.event.layerX, y: d3.event.layerY})){
					g.onItemClick();
				}
			});
		})
		.on("mousedown", ()=>{
			var pt = {x: d3.event.layerX, y: d3.event.layerY};
			if(this.isWithinGraph(-1, pt)){
				this.dragdata.start = pt;
			}
		})
		.on("mouseup", ()=>{
			var pt = {x: d3.event.layerX, y: d3.event.layerY};
			if(this.isWithinGraph(-1, pt)){
				this.dragdata.end = pt;
				if(this.zoomtype == this.zoomTypes.select &&
					Math.abs(this.dragdata.start.x - this.dragdata.end.x) > 1 &&
					Math.abs(this.dragdata.start.y - this.dragdata.end.y) > 1) 
					this.setXDomainWithPt(this.dragdata.start.x, this.dragdata.end.x);
				this.dragdata.start = false;
				this.dragdata.end = false;
			}
		});

		this.graphs.forEach((g)=>{
			if(g.setMouseEffects) g.setMouseEffects();
		})
	}

	this.resetZoom = function(){
		this.updateZoom([this.dataprop.start, this.dataprop.end])
		this.setZoompropWithXDomain([this.dataprop.start, this.dataprop.end])
		this.d3zoom.translate(this.zoomprop.t);
		this.d3zoom.scale(this.zoomprop.sc);
	}

	this.setXDomainWithPt = function(x1, x2){
		var min = Math.min(x1, x2);
		var max = Math.max(x1, x2);
		if(this.graphs.length > 0){
			var xdomain = [
				this.graphs[0].xScale.invert(min),
				this.graphs[0].xScale.invert(max)
			];
			this.updateZoom(xdomain);
			this.setZoompropWithXDomain(xdomain);
			this.d3zoom.translate(this.zoomprop.t);
			this.d3zoom.scale(this.zoomprop.sc);
		}
	}
	this.setZoompropWithXDomain = function(xdomain){
		var s = xdomain[0];
		var e = xdomain[1];
		var m = this.dataprop.delta / this.width;

		if(this.graphs.length > 0) {
			this.zoomprop.t[0] = (this.width - this.grapharea.right) * (s - this.dataprop.start) + this.grapharea.left * (e - this.dataprop.start);
			this.zoomprop.t[0] /= (s - e);

			this.zoomprop.t[0] = this.graphs[0].xScale(0);
			// Derived from delayZoom()
			this.zoomprop.sc = m * (this.width - this.zoomprop.t[0] - this.grapharea.right) / (e - this.dataprop.start);
		}
	}

	this.isWithinGraph = function(index, pt){
		if(index == -1){
			// -1 means if it's in any graph at all
			return (pt.x > this.grapharea.left && pt.x < this.grapharea.left + this.grapharea.width &&
					pt.y > this.grapharea.top && pt.y < this.grapharea.top + this.grapharea.height)
		}
		var ret = true;
		ret &= pt.x > this.graphs[index].grapharea.left && pt.x < this.graphs[index].grapharea.left + this.graphs[index].grapharea.width;
		ret &= pt.y > this.graphs[index].plotoffset.y + this.graphs[index].grapharea.top && pt.y < this.graphs[index].plotoffset.y + this.graphs[index].grapharea.top + this.graphs[index].grapharea.height; 
		return ret;
	}

	this.updateGraphs = function(){
		this.datasize = 0;
		this.graphs.forEach((g)=>{
			if(this.initialized) g.updateGraph();
			this.dataprop.start = g.dataprop.start < this.dataprop.start ? g.dataprop.start : this.dataprop.start;
			this.dataprop.end = g.dataprop.end > this.dataprop.end ? g.dataprop.end : this.dataprop.end;
			if(g.datasize) this.datasize += g.datasize;
		});
		this.dataprop.delta = this.dataprop.end - this.dataprop.start;

		if (!this.initialized) {
			this.initialized = true;
			this.resetZoom();
			this.graphs.forEach((g)=>{
				if(g.setGUI) g.setGUI();
			});
		}
	}

	this.delayZoom = function(){
		var pt = {x: d3.event.sourceEvent.clientX, y: d3.event.sourceEvent.clientY};

		if(this.isWithinGraph(-1, pt)){
			this.zoomprop.t = d3.event.translate;
			this.zoomprop.sc = d3.event.scale;

			var m = this.dataprop.delta / this.width;
			var s = this.dataprop.start - m * this.zoomprop.t[0] / this.zoomprop.sc;
			var e = s + m * this.width / this.zoomprop.sc;

			// Account for margin
			var d = m * this.width / this.zoomprop.sc; // s - e
			s = s + d * (this.grapharea.left / this.width);
			e = e - d * (this.grapharea.right / this.width);

			this.updateZoom([s, e]);
		}else{
			this.d3zoom.translate(this.zoomprop.t);
			this.d3zoom.scale(this.zoomprop.sc);
		}
	}

	this.updateZoom = function(xdomain){
		this.graphs.forEach((g)=>{
			g.updateZoom(xdomain);
		})		
	}

	this.setGraphMargin = function(top, right, bottom, left){
		this.grapharea.top = top;
		this.grapharea.right = right;
		this.grapharea.bottom = bottom;
		this.grapharea.left = left;
		this.grapharea.width = this.width - left - right;
		this.grapharea.height = this.height - top - bottom;

		if(this.graphs.length == 1){
			this.graphs[0].setGraphMargin(top, right, bottom, left);
		}
		else{
			this.graphs.forEach((g,i)=>{
				if(i==0){
					g.setGraphMargin(top, right, 0, left);
				}else if(i == this.graphs.length - 1){
					g.setGraphMargin(0, right, bottom, left);
				}else{
					g.setGraphMargin(0, right, 0, left);
				}
			});
		}

		var h = this.grapharea.height / this.graphs.length
		this.graph_divs.style("height", (d,i)=>{
			this.graphs[i].plotoffset.y = (i == 0 ? 0 : this.grapharea.top) + i * h;
			var ret;
			if (i == 0){
				ret = this.grapharea.top + h;
			}else if(i == this.graphs.length - 1){
				ret = h + this.grapharea.bottom;
			}else{				
				ret = h;
			}
			return ret + "px";
		});
		this.resizeGraphs();

		// Set titles
		this.div_title.style("height", top + "px");
		this.div_xtitle.style("height", bottom + "px")
	}

	this.resizeGraphs = function(){
		this.graphs.forEach((g, i) => {
			var id = this.div_id + "-" + i;
			g.resizeGraph(id, i);
		});
	}

	this.constructor();
}

function sdAbsGraph(div_id, id){
	this.constructor = function(div_id, id){
		// Basic graph info
		this.id = id == undefined ? 0 : id;
		this.div_id = div_id+"-subgraph-"+this.id;
		document.getElementById(div_id).innerHTML = "<div id='"+this.div_id+"' style='height:100%;width:100%;position:relative;'></div>";
		this.div = document.getElementById(this.div_id);

		this.div.innerHTML = "<canvas id='canvas-" + this.id + "'></canvas>";
		this.canvas = document.getElementById("canvas-"+this.id);
		this.width = this.div.getBoundingClientRect().width;
		this.height = this.div.getBoundingClientRect().height;

		this.platform = Stardust.platform("webgl-2d", this.canvas, this.width, this.height);
		this.svg = d3.select("#"+this.div_id).append("svg").attr("id", "subplot-svg-" + this.id)
			.attr("width", this.width).attr("height", this.height)
			.style("position", "absolute").style("top", 0).style("left", 0);
		this.interact_svg = d3.select("#"+this.div_id).append("svg").attr("id", "interact-svg-" + this.id)
			.attr("width", this.width).attr("height", this.height)
			.style("position", "absolute").style("top", 0).style("left", 0).style("z-index", 900);
		this.gui = d3.select("#"+this.div_id).append("div").style({
			"z-index": "998", "top" : "0", "left": "0", "height" : "0px", "width": "0px",
			"position": "absolute"
		})

		// Properties
		this.colors = [
			[57,106,177,1],
			[218,124,48,1],
			[62,150,81,1],
			[204,37,41,1],
			[83,81,84,1],
			[107,76,154,1],
			[148,139,61,1],
			[146,36,40,1],
			[146,36,40,1],
			[146,36,40,1],
			[146,36,40,1],
			[146,36,40,1],
			[146,36,40,1]
		];
		this.dataprop = {
			start:undefined, end:undefined, delta:undefined,
			min:undefined, max:undefined, ydelta:undefined 
		}
		this.grapharea = {
			left:0, right:0, top:0, bottom:0,
			width:0, height:0
		}
		this.graphprop = {
			strokewidth: 2,
			tipstrokewidth:2, 
			xdomain:[]
		}
		this.hasAxis = {
			x:true, y:true
		}

		// Set up white blocks for blocking excess graph
		this.frames = Stardust.mark.create(Stardust.mark.rect(), this.platform);
		this.frame_dim = [];
		this.frames.attr("p1", d => d.p1).attr("p2", d => d.p2).attr("color", [255, 255, 255, 1]);

		// Set up background for graph only
		this.bg = Stardust.mark.create(Stardust.mark.rect(), this.platform);
		this.bg.attr("p1", d => d.p1).attr("p2", d => d.p2);
		this.bg_color = [255, 255, 255, 1];
	}

	this.setGraphMargin = function(top, right, bottom, left){
		this.grapharea.top = top; this.grapharea.right = right; this.grapharea.bottom = bottom; this.grapharea.left = left;
		this.grapharea.width = this.width - left - right;
		this.grapharea.height = this.height - top - bottom;
		this.frame_dim = [
			{p1: [0,0], p2: [left, this.height]},
			{p1: [0,0], p2: [this.width, top]},
			{p1: [this.width - right, 0], p2: [this.width, this.height]},
			{p1: [0, this.height - bottom], p2: [this.width, this.height]}
		]
	}

	this.arrToRGB = function(arr, opacity){
		var a;
		opacity = opacity == undefined ? 1 : opacity;
		if (arr.length >= 4){
			arr[3] = opacity == undefined ? arr[3] : opacity;
			a = "rgba("+arr.join()+")";
		}else if(arr.length == 3){
			a = "rgba("+arr.join()+","+ opacity + ")";
		}else{
			a = "rgba(0,0,0,"+ opacity + ")"
		}
		return a;
	}

	this.clrArrToDecimal = function(arr){
		var ret = arr.map((c, i) => i == 3 ? i : c/255);
		return ret;
	}

	this.withinGrapharea = function(x, y){
		return x > this.grapharea.left && x < (this.grapharea.left + this.grapharea.width) && y > this.grapharea.top && y < (this.grapharea.top + this.grapharea.height);
	}

	this.constructor(div_id, id);
}

function sdLine(div_id, id){
	this.super = new sdAbsGraph(div_id, id);
	this.consturctor = function(div_id, id){
		this.id = this.super.id;
		this.div_id = this.super.div_id;
		this.div = this.super.div;

		this.canvas = this.super.canvas;
		this.width = this.super.width;
		this.height = this.super.height;

		this.platform = this.super.platform;
		this.svg = this.super.svg;
		this.interact_svg = this.super.interact_svg;
		this.gui = this.super.gui;

		this.dataset = this.dataset == undefined ? [] : this.dataset;
		this.datasize = this.datasize == undefined ? 0 : this.datasize;
		// This determines the resolution of the graph shown on screen, represent how many data points can be shown at once.
		this.resolution = this.resolution == undefined ? 30000 : this.resolution; 

		// some prop
		this.shrinkY = this.shrinkY == undefined ? true : this.shrinkY;
		this.toolTipLocation = {
			onMouse: 0,
			topLeft: 1,
			topRight: 2
		}
		this.snapTooltip = this.toolTipLocation.topLeft;

		this.dataprop = this.dataprop == undefined ? this.super.dataprop : this.dataprop; 
		this.grapharea = this.grapharea == undefined ? this.super.grapharea : this.grapharea; 
		this.graphprop = this.graphprop == undefined ? this.super.graphprop : this.graphprop;
		this.colors = this.super.colors;
		this.hasAxis = this.hasAxis == undefined ? this.super.hasAxis : this.hasAxis;

		// Set up white blocks for blocking excess graph
		this.frames = this.super.frames;
		this.frame_dim = this.super.frame_dim;
		this.bg = this.super.bg;
		this.bg_color = this.bg_color == undefined ? this.super.bg_color : this.bg_color;

		this.setGraphMargin(this.grapharea.top, this.grapharea.right, this.grapharea.bottom, this.grapharea.left);

		// Set up axis scaling
		this.xScale = d3.scale.linear();
		this.yScale = d3.scale.linear();
		this.xAxis = d3.svg.axis().scale(this.xScale).orient("bottom");
		this.yAxis = d3.svg.axis().scale(this.yScale).orient("left");
		this.xAxisGroup = this.svg.append("g").attr("class", "x axis");
		this.yAxisGroup = this.svg.append("g").attr("class", "y axis");
	}

	this.addData = function(series, x, y, proc){
		var exists = false;
		proc = proc == undefined ? "" : proc;
		for(var i = 0; i < this.dataset.length; i++){
			var v = this.dataset[i];
			if(v.series == series){
				v.data.push({
					x:x,
					y:y,
					proc:proc
				});
				exists = true;
				break;
			}
		}

		if(!exists){
			this.dataset.push({
				series:series,
				data:[{x:x, y:y, proc:proc}],
				sdVars:{} // holds stardust variables
			})
		}

		this.dataprop.start = (this.dataprop.start == undefined || x < this.dataprop.start) ? x : this.dataprop.start;
		this.dataprop.end = (this.dataprop.end == undefined || x > this.dataprop.end) ? x : this.dataprop.end;
		this.dataprop.min = (this.dataprop.min == undefined || y < this.dataprop.min) ? y : this.dataprop.min;
		this.dataprop.max = (this.dataprop.max == undefined || y > this.dataprop.max) ? y : this.dataprop.max;
		this.datasize++;
	}

	this.addSeriesDataSet = function(name, dataset){
    	for(var i = 0; i < dataset.length; i++){
    		if(dataset[i].x != null && dataset[i].y != null){
    			this.addData(name, dataset[i].x, dataset[i].y, dataset[i].proc);
    		}else{
    			return false;
    		}
    	}
    	return true;
    }

	this.updateGraph = function(){
		if(this.graphprop.xdomain.length != 2) this.graphprop.xdomain = [this.dataprop.start, this.dataprop.end];

		this.setGraphMargin(this.grapharea.top, this.grapharea.right, this.grapharea.bottom, this.grapharea.left);

		this.dataprop.delta = this.dataprop.end - this.dataprop.start;
		this.dataprop.ydelta = this.dataprop.max - this.dataprop.min;

		this.dataset.forEach((v, i)=>{
			if(!v.sdVars.lineSpec || !v.sdVars.lines) {
				v.sdVars.lineSpec = Stardust.mark.line();
				v.sdVars.lines = Stardust.mark.create(v.sdVars.lineSpec, this.platform);

				v.sdVars.lines.attr("width", 2).attr("color", this.clrArrToDecimal(this.colors[i]))
					.attr("p1", (d, j) => {
						// if (j == 0) return [0,0];
						// return [this.xScale(v.data[j-1].x), this.yScale(v.data[j-1].y)];
						return [this.xScale(d[0].x), this.yScale(d[0].y)];
					})
					.attr("p2", (d, j) => {
						// if (j == 0) return [0,0];
						return [this.xScale(d[1].x), this.yScale(d[1].y)];		
					})
			}
		});

		this.renderGraph();
	}

	this.setGraphMargin = this.super.setGraphMargin;

	this.updateZoom = function(xdomain){
		this.graphprop.xdomain = xdomain;
		this.dataset.forEach((v, i)=>{
			this.xScale.domain(xdomain)
		});
		this.renderGraph();
		// this.updateGraph();

		if(this.mouse_g && d3.event && d3.event.sourceEvent){
			var pt = {x:d3.event.sourceEvent.layerX, y:d3.event.sourceEvent.layerY};
			var abspt = {x:d3.event.sourceEvent.clientX, y:d3.event.sourceEvent.clientY};
			if(abspt.y > this.plotoffset.y && abspt.y < this.plotoffset + this.height){
				this.renderTooltip(pt);
			}
		}
	}

	this.setGUI = function(){
		// Setting legends
		this.legends_div = this.gui.append("ul").attr("class", "legends").style({
			"position": "absolute", 
			"left": (this.grapharea.left + this.grapharea.width + "px"),
			"top": (this.grapharea.top + "px"),
			"max-width": (this.grapharea.right + "px")
		});
		this.legends = this.legends_div.selectAll(".legend").data(this.dataset).enter().append("li")
			.attr("class", "legend");
		this.legends.append("div").attr("class", "square").style("background", (d, i) => this.arrToRGB(this.colors[i]));
		this.legends.append("span").html((d) => " "+d.series);
		// this.legends.append("div").attr("class", "hint").style({
		// 	"position": "absolute", "right":"100%"
		// }).html((d) => d.series);
		this.legends.on("click", (d, i)=>{
			d.hidden = d.hidden ? false : true;
			this.legends[0][i].style.color = d.hidden ? "grey" : "black";
			var clr = this.arrToRGB(this.colors[i], d.hidden ? 0.5 : 1);
			this.legends[0][i].children[0].style.background = clr;
			this.renderGraph();
		});
		
	}

	this.setMouseEffects = function(){
		// Only call this once when all data are added.
		this.mouse_g = this.svg.append("g").attr("class", "mouse-over-effects");
		this.mouse_g_line = this.mouse_g.append("line").attr("x2", 0).attr("y2", this.grapharea.height)
			.attr("stroke", "grey").attr("stroke-width", 2).attr("opacity", 0);

		this.mouse_g_node = this.mouse_g.selectAll(".mouse-over-node")
			.data(this.dataset)
			.enter()
			.append("g")
			.attr("class", "mouse-over-node").attr("opacity", 0);
		this.mouse_g_node.append("circle")
			.attr("r", 7).style("stroke", (d,i) => this.arrToRGB(this.colors[i]))
			.style("fill", "none").style("stroke-width", this.graphprop.tipstrokewidth);

		d3.select("#"+this.div_id).append("div").style("width", 0).style("height", 0)
			.style("position", "absolute").style("left", 0).style("top", 0).attr("class", "mouse-tooltip-div");
		this.mouse_g_tooltip = d3.select("#"+this.div_id).select(".mouse-tooltip-div").selectAll("div")
			.data(this.dataset)
			.enter()
			.append("div")
			.style("display", "none").attr("class", "cus-line-tooltip");

		this.mouse_g_rect = this.interact_svg.append("svg:rect").attr("opacity", 0)
			.attr("width", this.grapharea.width).attr("height", this.grapharea.height)
			.attr("transform", "translate("+this.grapharea.left+","+this.grapharea.top+")");

		this.mouse_g_rect
		.on("mouseover", ()=>this.onMouseover())
		.on("mouseleave", ()=>this.onMouseleave())
		.on("mousemove", ()=>this.onMousemove())
		.on("click", ()=> this.onItemClick());
	}

	this.onMouseover = function(){
		var pt = {x:d3.event.layerX, y:d3.event.layerX};
		this.mouse_g_line.attr("opacity", 1);
		this.mouse_g_node.attr("opacity", (d) => d.hidden ? 0 : 1);
		this.mouse_g_tooltip.style("display", (d) => d.hidden ? "none" : "block");
	}
	this.onMouseleave = function(){
		this.mouse_g_line.attr("opacity", 0);
		this.mouse_g_node.attr("opacity", 0);
		this.mouse_g_tooltip.style("display", "none");
	}
	this.onMousemove = function(pt){
		pt = pt == undefined ? {x:d3.event.layerX, y:d3.event.layerY} : pt;
		this.mouse_g_line.attr("transform", "translate(" + (pt.x) +","+this.grapharea.top+")")
		this.renderTooltip(pt);
	}

	this.onItemClick = function(){
		this.dataset.forEach((d, i) => {
			print(d.series, d.hovering);
		})
	}

	this.renderTooltip = function(mouse_pos){
		if(this.mouse_g_node){
			this.mouse_g_node.attr("transform", (d, i)=>{
				if(!d.hidden){					
					var x_index = this.xScale.invert(mouse_pos.x);
					x_index = this.bisect(d.data, x_index);

					x_index = x_index >= d.data.length ? d.data.length-1 : x_index;
					var v = d.data[x_index];
					var pt = {x:this.xScale(v.x), y:this.yScale(v.y)};

					if(pt.x > this.grapharea.left + this.grapharea.width || pt.x < this.grapharea.left){
						d.hovering = false;
						return "translate(-10,-10)";
					}
					d.hovering = pt;
					d.hovering.index = x_index;
					d.hovering.data = v;
					return "translate("+pt.x+","+pt.y+")";
				}
				return "translate(0,0)";
			});
		}
		if(this.mouse_g_tooltip){
			this.mouse_g_tooltip.style("left", (d, i)=>{
				var div = this.mouse_g_tooltip[0][i];
				var ret;
				if(this.snapTooltip == this.toolTipLocation.onMouse){
					ret = d.hovering.x - (div.getBoundingClientRect().width / 2);
				}else if(this.snapTooltip == this.toolTipLocation.topLeft){
					ret = this.grapharea.left + 5;
				}else if(this.snapTooltip == this.toolTipLocation.topRight){
					ret = this.grapharea.left + this.grapharea.width - div.getBoundingClientRect().width - 5;
				}
				return ret + "px";
			}).style("top", (d, i)=>{
				var div = this.mouse_g_tooltip[0][i];
				var ret;
				if(this.snapTooltip == this.toolTipLocation.onMouse){
					ret = d.hovering.y - (div.getBoundingClientRect().height) - 10;
				}else if(this.snapTooltip == this.toolTipLocation.topLeft){
					ret = this.grapharea.top + i * div.getBoundingClientRect().height + 5;
				}else if(this.snapTooltip == this.toolTipLocation.topRight){
					ret = this.grapharea.top + i * div.getBoundingClientRect().height + 5;
				}
				return ret + "px";
			}).html((d, i)=>{
				if(d.hovering){
					return this.dataset[i].series + ": " + d.hovering.data.y;
				}else{
					return "";
				}
			}).style("background", (d, i)=>{
				return this.arrToRGB(this.colors[i], 0.7);
			}).style("display",(d) => (d.hovering && !d.hidden) ? "block" : "none");
		}
	}

	this.formatDataset = function(data, xdomain, max_pts){
		// based on xdomain, decide how how many elements per group
		// max_pts is how many total data points can be displayed on graph, this number if for all series.
		var start = this.bisect(data, xdomain[0]) - 1;
		var end = this.bisect(data, xdomain[1]) + 10;
		start = start < 0 ? 0 : start;
		end = end >= data.length ? data.length - 1 : end;
		var delta = end - start;

		// scale must be integer that is >= 1
		var scale = 1;
		max_pts = parseInt(max_pts * (data.length / this.datasize));
		scale = parseInt(delta / max_pts);
		scale = scale < 1 ? 1 : scale;
		scale = parseInt(scale);

		// get the rolling avg array
		var d = [];
		for (i = start; i < end - scale; i+=scale){
			d.push(data.slice(i, i+scale));
		}
		d = d.map((group) => {
			var index = 0;
			for(var i = 1; i < group.length; i++){
				index = group[i].y > group[index].y ? i : index; 
			}
			return group[index];
		});
		

		for (i = 0; i < d.length - 1; i++){
			d[i] = [d[i], d[i+1]]
		}
		d.pop();

		return d;
	}

	this.renderGraph = function(){
		this.platform.clear();

		// Set bg
		this.bg.data([{p1:[0, 0], p2:[this.width, this.height]}]).attr("color", this.clrArrToDecimal(this.bg_color)).render();

		// Render axis
		this.renderXAxis();
		this.renderYAxis();

		// Render actual graph with data
		var stime = Date.now();
		this.dataset.forEach((v, i)=>{
			if(!v.hidden){
				v.sdVars.lines.attr("width", this.graphprop.strokewidth).data(this.formatDataset(v.data, this.graphprop.xdomain, this.resolution));
				v.sdVars.lines.render();
			}
		});
		print("graph render: " + (Date.now() - stime) + "ms");

		if(this.zoomInstances) this.zoomInstances = [];

		// Set blocking frames
		this.frames.data(this.frame_dim).render();

		// Set mouse effect rect
		if(this.mouse_g){
			this.mouse_g_line.attr("y2", this.grapharea.height);
			this.mouse_g_rect
				.attr("width", this.grapharea.width).attr("height", this.grapharea.height)
				.attr("transform", "translate("+this.grapharea.left+","+this.grapharea.top+")");
		}
	}

	this.renderXAxis = function(){
		this.xScale
			.domain(this.graphprop.xdomain)
			.range([this.grapharea.left, this.grapharea.left + this.grapharea.width]);
		if(this.hasAxis.x){
			this.xAxisGroup.call(this.xAxis)
				.attr("transform", "translate(0, "+(this.grapharea.top + this.grapharea.height)+")");
		}
	}

	this.renderYAxis = function(){
		var yPadding = 0.05;
		var ydomain = [this.dataprop.min - this.dataprop.ydelta * yPadding, this.dataprop.max + this.dataprop.ydelta * yPadding];

		if(this.shrinkY){
			var max = this.dataprop.min;
			var min = this.dataprop.max;
			this.dataset.forEach((v, i) => {
				if(!v.hidden){					
					var start_index = this.bisect(v.data, this.graphprop.xdomain[0]);
					start_index = start_index == 0 ? start_index : start_index - 1;
					var end_index = this.bisect(v.data, this.graphprop.xdomain[1]);
					for(var i = start_index; i < end_index; i++){
						max = v.data[i].y > max ? v.data[i].y : max; 
						min = v.data[i].y < min ? v.data[i].y : min;
					}
				}
			});
			max = Math.max(min, max);
			min = Math.min(min, max);
			var delta = max - min;
			ydomain = [min - delta * yPadding, max + delta * yPadding];
		}

		this.yScale
			.domain(ydomain)
			.range([this.grapharea.top + this.grapharea.height, this.grapharea.top]);
		if(this.hasAxis.y){
			this.yAxisGroup.call(this.yAxis)
				.attr("transform", "translate("+this.grapharea.left+",0)");
		}
	}

	this.resizeGraph = function(div_id, id){
		this.dataset.forEach((v)=>{
			v.sdVars = {};
		});
		this.super.constructor(div_id, id);
		this.constructor(div_id, id);
		this.setMouseEffects();
		this.updateGraph();
	}

	this.bisect = d3.bisector(function(d) { return d.x; }).right;
	this.arrToRGB = this.super.arrToRGB;
	this.clrArrToDecimal = this.super.clrArrToDecimal;
	this.withinGrapharea = this.super.withinGrapharea;

	this.consturctor(div_id, id);
}

function sdGantt(div_id, id){
	this.super = new sdAbsGraph(div_id, id);
	this.consturctor = function(div_id, id){
		this.id = this.super.id;
		this.div_id = this.super.div_id;
		this.div = this.super.div;

		this.canvas = this.super.canvas;
		this.width = this.super.width;
		this.height = this.super.height;

		this.platform = this.super.platform;
		this.svg = this.super.svg;
		this.interact_svg = this.super.interact_svg;

		this.dataset = this.dataset == undefined ? [] : this.dataset;
		this.datasize = this.datasize == undefined ? 0 : this.datasize;
		this.categories = this.categories == undefined ? [] : this.categories;
		this.pidToColor = this.pidToColor == undefined ? {} : this.pidToColor;

		// some prop		
		this.shrinkY = this.shrinkY == undefined ? true : this.shrinkY;

		this.dataprop = this.dataprop == undefined ? this.super.dataprop : this.dataprop;
		this.grapharea = this.grapharea == undefined ? this.super.grapharea : this.grapharea;
		this.graphprop = this.graphprop == undefined ? this.super.graphprop : this.graphprop;
		this.colors = this.super.colors;
		this.hasAxis = this.hasAxis == undefined ? this.super.hasAxis : this.hasAxis;

		// Set up white blocks for blocking excess graph
		this.frames = this.super.frames;
		this.frame_dim = this.super.frame_dim;
		this.bg = this.super.bg;
		this.bg_color = this.super.bg_color;

		this.setGraphMargin(this.grapharea.top, this.grapharea.right, this.grapharea.bottom, this.grapharea.left);

		// Set up axis scaling
		this.xScale = d3.scale.linear();
		this.yScale = d3.scale.ordinal();
		this.xAxis = d3.svg.axis().scale(this.xScale).orient("bottom");
		this.yAxis = d3.svg.axis().scale(this.yScale).orient("left");
		this.xAxisGroup = this.svg.append("g").attr("class", "x axis");
		this.yAxisGroup = this.svg.append("g").attr("class", "y axis");
	}

	this.addData = function(category, pid, pname, start, end){
		var index = this.categories.indexOf(category);
		if(index < 0){
			this.categories.push(category);
			this.dataset.push({
				category: category,
				data: [],
				sdVars:{}
			})
		}

		index = this.categories.indexOf(category);
		this.dataset[index].data.push({
			pid:pid,
			pname:pname,
			start:start,
			end:end
		})

		if (!this.pidToColor[pid]){
			this.pidToColor[pid] = Object.keys(this.pidToColor).length;
		}

		this.dataprop.start = (this.dataprop.start == undefined || start < this.dataprop.start) ? start : this.dataprop.start;
		this.dataprop.end = (this.dataprop.end == undefined || end > this.dataprop.end) ? end : this.dataprop.end;
		this.datasize++;
	}

	this.addDataSet = function(dataset){
    	for(var i = 0; i < dataset.length; i++){
    		d = dataset[i];
    		if(d.category != null && d.pid != null && d.start != null && d.end != null && d.pname != null){
    			this.addData(d.category, d.pid, d.pname, d.start, d.end);
    		}else{
    			return false;
    		}
    	}
    	return true;
    }

	this.updateGraph = function(){
		if(this.graphprop.xdomain.length != 2) this.graphprop.xdomain = [this.dataprop.start, this.dataprop.end];

		this.setGraphMargin(this.grapharea.top, this.grapharea.right, this.grapharea.bottom, this.grapharea.left);

		this.dataprop.delta = this.dataprop.end - this.dataprop.start;

		this.dataset.forEach((v, i)=>{
			if(!v.sdVars.rectSpec || !v.sdVars.rects) {
				v.sdVars.rectSpec = Stardust.mark.rect();
				v.sdVars.rects = Stardust.mark.create(v.sdVars.rectSpec, this.platform);

				v.sdVars.rects.attr("color", (d, j) => this.clrArrToDecimal(this.colors[this.pidToColor[d.pid]]))
					.attr("p1", (d, j) => {
						return [this.xScale(d.start), this.yScale(this.categories[i])];
					})
					.attr("p2", (d, j) => {
						return [this.xScale(d.end), this.yScale(this.categories[i]) + (this.grapharea.height / this.num_visiblerows)];				
					})
			}
		});

		this.renderGraph();
	}

	this.setGraphMargin = this.super.setGraphMargin;

	this.updateZoom = function(xdomain){
		this.graphprop.xdomain = xdomain;
		this.dataset.forEach((v, i)=>{
			this.xScale.domain(xdomain)
		});
		this.renderGraph();		
		// this.updateGraph();

		if(this.mouse_g && d3.event && d3.event.sourceEvent){
			var pt = {x:d3.event.sourceEvent.layerX, y:d3.event.sourceEvent.layerY};
			var abspt = {x:d3.event.sourceEvent.clientX, y:d3.event.sourceEvent.clientY};
			if(abspt.y > this.plotoffset.y && abspt.y < this.plotoffset + this.height){
				this.renderTooltip(pt);
			}
		}
	}

	this.setMouseEffects = function(){
		// return;
		this.mouse_g = this.svg.append("g").attr("class", "mouse-over-effects");

		this.mouse_g_node = this.mouse_g.selectAll(".mouse-over-node")
			.data(this.dataset)
			.enter()
			.append("g")
			.attr("class", "mouse-over-node").attr("opacity", 0);

		d3.select("#"+this.div_id).append("div").style("width", 0).style("height", 0)
			.style("position", "absolute").style("left", 0).style("top", 0).attr("class", "mouse-tooltip-div");
		this.mouse_g_tooltip = d3.select("#"+this.div_id).select(".mouse-tooltip-div")
			.append("div")
			.style("display", "none").attr("class", "cus-gantt-tooltip");
		this.mouse_g_highlight = d3.select("#"+this.div_id).select(".mouse-tooltip-div")
			.append("div")
			.style("display", "none").attr("class", "cus-gantt-highlight");

		this.mouse_g_rect = this.interact_svg.append("svg:rect").attr("opacity", 0)
			.attr("width", this.grapharea.width).attr("height", this.grapharea.height)
			.attr("transform", "translate("+this.grapharea.left+","+this.grapharea.top+")");

		this.mouse_g_rect
		.on("mouseover", ()=> this.onMouseover())
		.on("mouseleave", ()=> this.onMouseleave())
		.on("mousemove", ()=> this.onMousemove())
		.on("click", ()=> this.onItemClick());
	}

	this.onMouseover = function(){
		var pt = {x:d3.event.layerX, y:d3.event.layerX};
		this.mouse_g_node.attr("opacity", 1);
	}
	this.onMouseleave = function(){
		this.mouse_g_node.attr("opacity", 0);
		this.mouse_g_tooltip.style("display", "none");
	}
	this.onMousemove = function(pt){
		pt = pt == undefined ? {x:d3.event.layerX, y:d3.event.layerY} : pt;
		this.renderTooltip(pt);
	}

	this.onItemClick = function(){
		print(this.hovering);
	}

	this.renderTooltip = function(mouse_pos){
		if(this.mouse_g){		
			var h = this.grapharea.height / this.num_visiblerows;
			var row = 0;
			for(var i = 0; i < this.dataset.length; i++) {
				var d = this.dataset[i];
				if(d.hidden){
					continue;
				}
				if(mouse_pos.y > row * h && mouse_pos.y < (row+1)*h){
					var x_index = this.xScale.invert(mouse_pos.x);
					x_index = this.bisect(d.data, x_index);
					x_index -= 1;
					x_index = x_index < 0 ? 0 : x_index;

					this.hovering = false;
					for(var j = x_index; j < x_index + 3; j++){
						if(j < d.data.length){
							var v = d.data[j];
							var pt = {start:this.xScale(v.start), end:this.xScale(v.end)};
							if(mouse_pos.x > pt.start && mouse_pos.x < pt.end){
								this.hovering = pt;
								this.hovering.top = row*h;
								this.hovering.bottom = (row+1)*h;
								this.hovering.data = v;
							}
						}
					}
				}
				row++;
			}
		}

		if(this.mouse_g_tooltip){
			if(this.hovering){
				this.mouse_g_tooltip
					.style("display", "block")
					.html( () => {
						var ret = "";
						ret += "<div class='line'><strong>Start: </strong> <span>"+ this.hovering.data.start +"</span></div>";
						ret += "<div class='line'><strong>End: </strong> <span>"+ this.hovering.data.end +"</span></div>";
						ret += "<div class='line'><strong>Process Name: </strong> <span>"+ this.hovering.data.pname +"</span></div>";
						ret += "<div class='line'><strong>Process ID: </strong> <span>"+ this.hovering.data.pid +"</span></div>";
						return ret;
					})
					.style("left", () => {
						return (this.hovering.start + this.hovering.end)/2 - this.mouse_g_tooltip[0][0].getBoundingClientRect().width / 2 + "px";
					})
					.style("top", () => {
						return this.hovering.top - this.mouse_g_tooltip[0][0].getBoundingClientRect().height - 7 + "px";
					});
				this.mouse_g_highlight
					.style({
						"display": "block",
						"top": this.hovering.top +"px",
						"left": this.hovering.start + "px",
						"width": (this.hovering.end - this.hovering.start) +"px",
						"height": (this.hovering.bottom - this.hovering.top) +"px"
					})
			}else{
				this.mouse_g_tooltip.style("display", "none");
				this.mouse_g_highlight.style("display", "none");
			}
		}

	}

	this.renderGraph = function(){
		this.platform.clear();

		// For num of shown categories
		this.num_visiblerows = d3.sum(this.dataset.map((d)=> d.hidden ? 0 : 1));

		// Set bg
		this.bg.data([{p1:[0, 0], p2:[this.width, this.height]}]).attr("color", this.clrArrToDecimal(this.bg_color)).render();

		// Render axis
		this.renderXAxis();
		this.renderYAxis();

		// Render actual graph with data
		this.dataset.forEach((v, i)=>{
			if(!v.hidden){
				v.sdVars.rects.data(v.data);
				v.sdVars.rects.render();
			}
		});

		// Set blocking frames
		this.frames.data(this.frame_dim).render();

		// Set mouse effect rect
		if(this.mouse_g){
			this.mouse_g_rect
				.attr("width", this.grapharea.width).attr("height", this.grapharea.height)
				.attr("transform", "translate("+this.grapharea.left+","+this.grapharea.top+")");
		}
	}

	this.renderXAxis = function(){
		this.xScale
			.domain(this.graphprop.xdomain)
			.range([this.grapharea.left, this.grapharea.left + this.grapharea.width]);
		if(this.hasAxis.x){
			this.xAxisGroup.call(this.xAxis)
				.attr("transform", "translate(0, "+(this.grapharea.top + this.grapharea.height)+")");
		}
	}

	this.renderYAxis = function(){
		this.yScale
			.domain(this.dataset.filter((d)=> !d.hidden).map((d)=> d.category))
			.rangeBands([this.grapharea.top, this.grapharea.top + this.grapharea.height]);
		if(this.hasAxis.y){
			this.yAxisGroup.call(this.yAxis)
				.attr("transform", "translate("+this.grapharea.left+",0)");
		}
	}
	
	this.resizeGraph = function(div_id, id){
		this.dataset.forEach((v)=>{
			v.sdVars = {};
		});
		this.super.constructor(div_id, id);
		this.constructor(div_id, id);
		this.setMouseEffects();
		this.updateGraph();
	}

	this.bisect = d3.bisector(function(d) { return d.start; }).right;
	this.arrToRGB = this.super.arrToRGB;
	this.clrArrToDecimal = this.super.clrArrToDecimal;
	this.withinGrapharea = this.super.withinGrapharea;

	this.consturctor(div_id, id);
}

var lastTimer = undefined;
var logTime = true;
function timer(name){
	if(!logTime) return;
	var ret = "";
	if(lastTimer){
		var a = Date.now();
		ret = a - lastTimer;
		lastTimer = a;
		print(name + ": " + ret +"ms");
	}else{
		lastTimer = Date.now();
	}
	return ret
}

function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}