/**************************************
 * Copyright: David Parker
 * Ludum Dare 26: Minimalist Moe
 **************************************/
// Do everything after jQuery detects DOM is loaded
$(function() {
    // Check for webgl
    if (!Detector.webgl) Detector.addGetWebGLMessage();

    // Globals
    var $container=$("#game"),DEBUG=true;

    // Universe
    var stats, camera, scene, projector, renderer;

    // Minimalist Moe
    var MM;

    // Ensure shaders are loaded then start
    SL.Shaders.loadedSignal.add(init);

    /*
     * INITIALIZATION
     */
    // All initialization should go here
    function init() {
        initEventListeners();
        initSceneAndCamera();
        initProjector();
        initRenderer();
        initStats();
        initGame();
//        initObjects();
        animate();
    }

    function initEventListeners() {
	// Register window and document callbacks
/*
	document.addEventListener('mousemove', mouseMove, false);
	document.addEventListener('mousedown', mouseDown, false);
	document.addEventListener('mouseup', mouseUp, false);
*/
    }

    function initSceneAndCamera() {
        scene = new THREE.Scene();
        camera = new THREE.OrthographicCamera(
            $container.width()/-2,$container.width()/2,
            $container.height()/2,$container.height()/-2,
            0,100 // no depth
        ); 
        scene.add(camera);
    }

    // Creates the shader programs into a JS object
/*
    function initShaders() {
	var attributes = ["aVertex","aColor"]
        shaders = {
            "none":createProgramFromShaders(
                gl,
                createShader(gl, gl.VERTEX_SHADER, SL.S.simple.vertex),
                createShader(gl, gl.FRAGMENT_SHADER, SL.S.pre.fragment + SL.S.copy.fragment + SL.S.end.fragment),
                attributes
            )
        };
    }
*/

    function initProjector() {
	projector = new THREE.Projector();
    }

    function initRenderer() {
        renderer = new THREE.WebGLRenderer();
        renderer.setSize($container.width(), $container.height());
        $container.append(renderer.domElement);
    }

    function initStats() {
        if (DEBUG) {
	    stats = new Stats();
	    stats.domElement.style.position = 'absolute';
	    stats.domElement.style.top = '0px';
	    $("body").append(stats.domElement);
        }
    }

    function initGame() {
        MM = MM || {
            level:0,
            objs:[],
            init: function() {
                this.initHome();
                this.initMoe();
                this.initBullet();
                this.initTriangleEnemy();
//                this.initSquareEnemy();
//                this.initRectangleEnemy();
                for (var i=0;i<this.objs.length;i++) {
                    scene.add(this.objs[i].mesh);
                }
                return this;
            },
            initHome: function() {
                // home to defend
                var home = {
                    "name":"home",
                    "life":100,
                    "pos":{"x":0-$container.width()/2,"y":0},
                    "height":499,
                    "width":100,
                    init: function(_this) {
                        this.geometry = new THREE.CubeGeometry(this.width, this.height, 1);
                        this.material = new THREE.MeshBasicMaterial({color:0xff0000, wireframe:true});
                        this.mesh = new THREE.Mesh(this.geometry, this.material);
                        this.mesh.position.set(this.pos.x+this.width/2+1,this.pos.y,0);
                        _this.objs.push(this);
                    }
                }.init(this);
            },
            initMoe: function() {
                // moe
                var moe = {
                    "name":"moe",
                    "pos":{"x":0-$container.width()/2,"y":0},
                    "radius":50,
                    "init": function(_this) {
                        this.geometry = new THREE.CircleGeometry(this.radius,16);
                        //this.geometry = new THREE.SphereGeometry(this.radius,16,16);
                        this.material = new THREE.MeshBasicMaterial({color:0xff00ff, wireframe:true});
                        this.mesh = new THREE.Mesh(this.geometry, this.material);
                        this.mesh.position.set(this.pos.x+this.radius,this.pos.y,0);
                        //this.mesh.rotation.x = (Math.PI/180*90); // top view
                        _this.objs.push(this);
                    }
                }.init(this);
            },
            initBullet: function() {
                var bullet = {
                    "name":"bullet",
                    "active":"false",
                    init: function(_this) {
                        _this.objs.push(this);
                    }
                }.init(this);
            },
            initTriangleEnemy: function() {
                var e = {
                    "name":"enemy",
                    "active":"false",
                    "life":0,
                    "speed":0,
                    init: function(_this) {

                        _this.objs.push(this);
                    }
                }.init(this);
            },
        }.init();
    }

    /**********
     * animate
     **********/
    function animate() {
        requestAnimationFrame(animate);
        //	handleKeys();
	render();
        if (DEBUG) stats.update();
    }

    /*********
     * render
     *********/
    function render() {
        for (var i=0; i<MM.objs.length; i++) {
            var obj = MM.objs[i];
//            console.debug(obj.name);
//            mesh.rotation.x += 0.05;
//            mesh.rotation.z += 0.04;
//            mesh.rotation.y += 0.02;
        }
        renderer.render(scene,camera);
    }

});
