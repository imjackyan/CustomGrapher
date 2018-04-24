print = console.log;

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

		// Set up zoomimg
		// this.mouse_cont = this.graph_cont.append("div").style("height", "100%").style("width", "100%")
		// 	.style("position", "absolute").style("top", 0).style("left", 0);
		this.d3zoom = d3.behavior.zoom();
		this.main_cont.call(this.d3zoom.on("zoom", ()=> {
			var pt = {x: d3.event.sourceEvent.clientX, y: d3.event.sourceEvent.clientY};

			if(pt.x > this.grapharea.left && pt.x < this.grapharea.left + this.grapharea.width &&
				pt.y > this.grapharea.top && pt.y < this.grapharea.top + this.grapharea.height){
				this.zoomprop.t = d3.event.translate;
				this.zoomprop.sc = d3.event.scale;
				var m = this.dataprop.delta / this.width;
				var s = this.dataprop.start - m * this.zoomprop.t[0] / this.zoomprop.sc;
				var e = s + m * this.width / this.zoomprop.sc;

				// Account for margin
				var d = e - s;
				s = s + d * (this.grapharea.left / this.width);
				e = e - d * (this.grapharea.right / this.width);

				this.updateZoom([s, e]);
			}else{
				this.d3zoom.translate(this.zoomprop.t);
				this.d3zoom.scale(this.zoomprop.sc);
			}
		}));

		// GUI container
		this.gui = this.main_cont.append("div").attr("class", "cus-gui");
		this.gui.append("input").attr("type", "button").attr("value", "Zoom to fit")
			.on("click", () => {
				this.updateZoom([this.dataprop.start, this.dataprop.end]);
				this.d3zoom.translate([0,0]);
				this.d3zoom.scale(1);
			})
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
	}

	this.getGraph = function(index){
		if(index < this.graphs.length){
			return this.graphs[index];
		}
		return false;
	}

	this.setMouseEffects = function(){
		this.graphs.forEach((g)=>{
			if(g.setMouseEffects) g.setMouseEffects();
		})
	}

	this.updateGraphs = function(){
		this.graphs.forEach((g)=>{
			g.updateGraph();
			this.dataprop.start = g.dataprop.start < this.dataprop.start ? g.dataprop.start : this.dataprop.start;
			this.dataprop.end = g.dataprop.end > this.dataprop.end ? g.dataprop.end : this.dataprop.end;
		});
		this.dataprop.delta = this.dataprop.end - this.dataprop.start;

		if (!this.initialized) {
			this.initialized = true;
			this.updateZoom([this.dataprop.start, this.dataprop.end]);
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
			this.graphs[i].plotoffset.y = this.grapharea.top + i * h;
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
			.style("position", "absolute").style("top", 0).style("left", 0).style("z-index", 999);

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

		// Set up white blocks for blocking excess graph
		this.frames = Stardust.mark.create(Stardust.mark.rect(), this.platform);
		this.frame_dim = [];
		this.frames.attr("p1", d => d.p1).attr("p2", d => d.p2).attr("color", [255, 255, 255, 1]);
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

		this.dataset = this.dataset == undefined ? [] : this.dataset;

		// some prop		
		this.shrinkY = this.shrinkY == undefined ? true : this.shrinkY;

		this.dataprop = this.dataprop == undefined ? this.super.dataprop : this.dataprop; 
		this.grapharea = this.grapharea == undefined ? this.super.grapharea : this.grapharea; 
		this.graphprop = this.graphprop == undefined ? this.super.graphprop : this.graphprop;
		this.colors = this.super.colors;

		// Set up white blocks for blocking excess graph
		this.frames = this.super.frames;
		this.frame_dim = this.super.frame_dim;

		this.setGraphMargin(this.grapharea.top, this.grapharea.right, this.grapharea.bottom, this.grapharea.left);

		// Set up axis scaling
		this.xScale = d3.scale.linear();
		this.yScale = d3.scale.linear();
		this.xAxis = d3.svg.axis().scale(this.xScale).orient("bottom");
		this.yAxis = d3.svg.axis().scale(this.yScale).orient("left");
		this.xAxisGroup = this.svg.append("g").attr("class", "x axis");
		this.yAxisGroup = this.svg.append("g").attr("class", "y axis");
	}

	this.addData = function(series, x, y){
		var exists = false;
		for(var i = 0; i < this.dataset.length; i++){
			var v = this.dataset[i];
			if(v.series == series){
				v.data.push({
					x:x,
					y:y
				});
				exists = true;
				break;
			}
		}

		if(!exists){
			this.dataset.push({
				series:series,
				data:[{x:x, y:y}],
				sdVars:{} // holds stardust variables
			})
		}

		this.dataprop.start = (this.dataprop.start == undefined || x < this.dataprop.start) ? x : this.dataprop.start;
		this.dataprop.end = (this.dataprop.end == undefined || x > this.dataprop.end) ? x : this.dataprop.end;
		this.dataprop.min = (this.dataprop.min == undefined || y < this.dataprop.min) ? y : this.dataprop.min;
		this.dataprop.max = (this.dataprop.max == undefined || y > this.dataprop.max) ? y : this.dataprop.max;
	}

	this.addSeriesDataSet = function(name, dataset){
    	for(var i = 0; i < dataset.length; i++){
    		if(dataset[i].x != null && dataset[i].y != null){
    			this.addData(name, dataset[i].x, dataset[i].y);
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
						if (j == 0) return [0,0];
						return [this.xScale(v.data[j-1].x), this.yScale(v.data[j-1].y)];
					})
					.attr("p2", (d, j) => {
						if (j == 0) return [0,0];
						return [this.xScale(d.x), this.yScale(d.y)];				
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

		if(this.mouse_g && d3.event && d3.event.sourceEvent){
			var pt = {x:d3.event.sourceEvent.layerX, y:d3.event.sourceEvent.layerY};
			this.renderTooltip(pt);
		}
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
		.on("mouseover", ()=>{
			var pt = {x:d3.event.layerX, y:d3.event.layerX};
			this.mouse_g_line.attr("opacity", 1);
			this.mouse_g_node.attr("opacity", 1);
			this.mouse_g_tooltip.style("display", "block");
		})
		.on("mouseleave", ()=>{
			this.mouse_g_line.attr("opacity", 0);
			this.mouse_g_node.attr("opacity", 0);
			this.mouse_g_tooltip.style("display", "none");
		})
		.on("mousemove", ()=>{
			var pt = {x:d3.event.layerX, y:d3.event.layerY};
			this.mouse_g_line.attr("transform", "translate(" + (pt.x) +","+this.grapharea.top+")")
			this.renderTooltip(pt);
		})
		.on("click", ()=>{
			this.dataset.forEach((d, i) => {
				print(d.series, d.hovering);
			})
		});
	}

	this.renderTooltip = function(mouse_pos){
		if(this.mouse_g_node){
			this.mouse_g_node.attr("transform", (d, i)=>{
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
			});
		}
		if(this.mouse_g_tooltip){
			this.mouse_g_tooltip.style("left", (d, i)=>{
				var div = this.mouse_g_tooltip[0][i];
				return d.hovering.x - (div.getBoundingClientRect().width / 2);
			}).style("top", (d, i)=>{
				var div = this.mouse_g_tooltip[0][i];
				return d.hovering.y - (div.getBoundingClientRect().height) - 10;
			}).html((d, i)=>{
				return d.hovering.data.y;
			}).style("background", (d, i)=>{
				return this.arrToRGB(this.colors[i], 0.7);
			});
		}
	}

	this.renderGraph = function(){
		this.platform.clear();

		// Render axis
		this.renderXAxis();
		this.renderYAxis();

		// Render actual graph with data
		this.dataset.forEach((v, i)=>{
			v.sdVars.lines.attr("width", this.graphprop.strokewidth).data(v.data);
			v.sdVars.lines.render();
		});

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
		this.xAxisGroup.call(this.xAxis)
			.attr("transform", "translate(0, "+(this.grapharea.top + this.grapharea.height)+")");
	}

	this.renderYAxis = function(){
		var yPadding = 0.05;
		var ydomain = [this.dataprop.min - this.dataprop.ydelta * yPadding, this.dataprop.max + this.dataprop.ydelta * yPadding];

		if(this.shrinkY){
			var max = this.dataprop.min;
			var min = this.dataprop.max;
			this.dataset.forEach((v, i) => {
				var start_index = this.bisect(v.data, this.graphprop.xdomain[0]);
				start_index = start_index == 0 ? start_index : start_index - 1;
				var end_index = this.bisect(v.data, this.graphprop.xdomain[1]);
				for(var i = start_index; i < end_index; i++){
					max = v.data[i].y > max ? v.data[i].y : max; 
					min = v.data[i].y < min ? v.data[i].y : min;
				}
			});
			var delta = max - min;
			ydomain = [min - delta * yPadding, max + delta * yPadding];
		}

		this.yScale
			.domain(ydomain)
			.range([this.grapharea.top + this.grapharea.height, this.grapharea.top]);
		this.yAxisGroup.call(this.yAxis)
			.attr("transform", "translate("+this.grapharea.left+",0)");
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
		this.categories = this.categories == undefined ? [] : this.categories;
		this.pidToColor = this.pidToColor == undefined ? {} : this.pidToColor;

		// some prop		
		this.shrinkY = this.shrinkY == undefined ? true : this.shrinkY;

		this.dataprop = this.dataprop == undefined ? this.super.dataprop : this.dataprop;
		this.grapharea = this.grapharea == undefined ? this.super.grapharea : this.grapharea;
		this.graphprop = this.graphprop == undefined ? this.super.graphprop : this.graphprop;
		this.colors = this.super.colors;

		// Set up white blocks for blocking excess graph
		this.frames = this.super.frames;
		this.frame_dim = this.super.frame_dim;

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
	}

	this.addDataSet = function(dataset){
    	for(i = 0; i < dataset.length; i++){
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
						return [this.xScale(d.end), this.yScale(this.categories[i]) + (this.grapharea.height / this.categories.length)];				
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

		if(this.mouse_g && d3.event && d3.event.sourceEvent){
			var pt = {x:d3.event.sourceEvent.layerX, y:d3.event.sourceEvent.layerY};
			this.renderTooltip(pt);
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

		this.mouse_g_rect = this.interact_svg.append("svg:rect").attr("opacity", 0)
			.attr("width", this.grapharea.width).attr("height", this.grapharea.height)
			.attr("transform", "translate("+this.grapharea.left+","+this.grapharea.top+")");

		this.mouse_g_rect
		.on("mouseover", ()=>{
			var pt = {x:d3.event.layerX, y:d3.event.layerX};
			this.mouse_g_node.attr("opacity", 1);
		})
		.on("mouseleave", ()=>{
			this.mouse_g_node.attr("opacity", 0);
		})
		.on("mousemove", ()=>{
			var pt = {x:d3.event.layerX, y:d3.event.layerY};
			this.renderTooltip(pt);
		})
		.on("click", ()=>{
			print(this.hovering);
		})
	}

	this.renderTooltip = function(mouse_pos){
		if(this.mouse_g){		
			var h = this.grapharea.height / this.dataset.length;
			for(var i = 0; i < this.dataset.length; i++) {
				var d = this.dataset[i];
				if(mouse_pos.y > i * h && mouse_pos.y < (i+1)*h){
					var x_index = this.xScale.invert(mouse_pos.x);
					x_index = this.bisect(d.data, x_index);
					x_index -= 2;
					x_index = x_index < 0 ? 0 : x_index;

					this.hovering = false;
					for(var j = x_index; j < x_index + 3; j++){
						if(j < d.data.length){
							var v = d.data[j];
							var pt = {start:this.xScale(v.start), end:this.xScale(v.end)};
							if(mouse_pos.x > pt.start && mouse_pos.x < pt.end){
								this.hovering = pt;
								this.hovering.data = v;
							}
						}
					}
				}
			}
		}
	}

	this.renderGraph = function(){
		this.platform.clear();

		// Render axis
		this.renderXAxis();
		this.renderYAxis();

		// Render actual graph with data
		this.dataset.forEach((v, i)=>{
			v.sdVars.rects.data(v.data);
			v.sdVars.rects.render();
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
		this.xAxisGroup.call(this.xAxis)
			.attr("transform", "translate(0, "+(this.grapharea.top + this.grapharea.height)+")");
	}

	this.renderYAxis = function(){
		this.yScale
			.domain(this.categories)
			.rangeBands([this.grapharea.top, this.grapharea.top + this.grapharea.height]);
		this.yAxisGroup.call(this.yAxis)
			.attr("transform", "translate("+this.grapharea.left+",0)");
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