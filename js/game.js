/**************************************
 * Copyright: David Parker
 * Ludum Dare 26: Minimalist Moe
 **************************************/
function splice(arr,value) {
    var index;
    for (var i=0; i<arr.length; i++) {
        if (arr[i] == value) {
            index = i;
            break;
        }
    }
    arr.splice(index,1);
}

// Do everything after jQuery detects DOM is loaded
$(document).ready(function() {
    // Check for webgl
    if (!Detector.webgl) Detector.addGetWebGLMessage();

    // Globals
    var $container=$("#game"), 
    DEBUG=true,
    mouse={x:0,y:0};

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
        addGameObjectsToScene();
        animate();
    }

    function initEventListeners() {
	// Register window and document callbacks
	document.addEventListener('mousedown', mouseDown, false);
    }

    function initSceneAndCamera() {
        scene = new THREE.Scene();
        camera = new THREE.OrthographicCamera(
            $container.width()/-2,$container.width()/2,
            $container.height()/2,$container.height()/-2,
            0,101 // no depth
        );
        camera.position.set(0,0,100);
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

    // initializes the game and all objects required for the game
    function initGame() {
        MM = MM || {
            level:0,
            kills:0,
            home:null,
            moe:null,
            bullets:[],
            enemies:[],
            init: function() {
                this.initHome();
                this.initMoe();
                return this;
            },

            // home to defend
            initHome: function() {
                var h = {
                    "name":"home",
                    "active":true,
                    "background":true,
                    "life":100,
                    "pos":{"x":0-$container.width()/2,"y":0},
                    "height":500,
                    "width":100,
                    init: function(_this) {
                        this.geometry = new THREE.PlaneGeometry(this.width, this.height, 1, 1);
                        this.material = new THREE.MeshBasicMaterial({color:0xff0000, wireframe:false});
                        this.mesh = new THREE.Mesh(this.geometry, this.material);
                        this.mesh.position.set(this.pos.x+this.width/2,this.pos.y,-1);
                        _this.home = this;
                    }
                }.init(this);
            },

            // the man in action
            initMoe: function() {
                var moe = {
                    "name":"moe",
                    "active":true,
                    "pos":{"x":0-$container.width()/2,"y":0},
                    "radius":50,
                    "init": function(_this) {
                        this.geometry = new THREE.CircleGeometry(this.radius,32);
                        this.material = new THREE.MeshBasicMaterial({color:0x000000, wireframe:true});
                        this.mesh = new THREE.Mesh(this.geometry, this.material);
                        this.mesh.position.set(this.pos.x+this.radius,this.pos.y,0);
                        _this.moe = this;
                    }
                }.init(this);
            }
        }.init();
    }

    function addGameObjectsToScene() {
        // background objects
        scene.add(MM.home.mesh);

        // moe
        scene.add(MM.moe.mesh);

        // enemies
        for (var i=-4; i<5; i++) {
            createTriangleEnemy(new THREE.Vector3($container.width()-500+100*i,50*i,0.0));
        }

        for (var i=0; i<MM.enemies.length; i++) {
            if (MM.enemies[i].active === true) {
                scene.add(MM.enemies[i].mesh);
            }
        }
    }

    /******
     * Mouse functionality
     ******/
    function mouseDown(event) {
	event.preventDefault();
	mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
	mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;
	var vector = new THREE.Vector3(mouse.x, mouse.y, 0.5);

        // use raycaster to determine vector of bullet
	projector.unprojectVector(vector, camera);
        var direction = vector.sub(camera.position).normalize();
	var ray = new THREE.Raycaster(camera.position, direction);
        var distance = -camera.position.z / direction.z;
        var pos = camera.position.clone().add(direction.multiplyScalar(distance));
//        console.debug(pos);
        createBullet(pos);
    }

    // bullets
    function createBullet(pos) {
        var b = {
            "name":"bullet",
            "active":true,
            "pos":{"x":0-$container.width()/2,"y":0},
            "radius":10,
            "speed":-10,
            "damage":10,
            init: function() {
                // FIXME: offset bug
                var BUG = {x:10,y:-30,x2:-25,y2:-50};
                this.originPoint = MM.moe.mesh.position.clone();
                this.clickPoint = pos;
                if (pos.x >= -120) {
                    this.clickPoint.x += BUG.x;
                    this.clickPoint.y += BUG.y;
                } else {
                    this.clickPoint.x += BUG.x2;
                    this.clickPoint.y += BUG.y2;
                }
                this.dir = this.originPoint.sub(this.clickPoint).normalize();
                this.speedX = this.speed*this.dir.x;
                this.speedY = this.speed*this.dir.y;
                this.geometry = new THREE.CircleGeometry(this.radius,32);
                this.material = new THREE.MeshBasicMaterial({color:0x000000, wireframe:true});
                this.mesh = new THREE.Mesh(this.geometry, this.material);
                this.mesh.position.set(this.pos.x+this.radius+50,this.pos.y,0);
                MM.bullets.push(this);
                scene.add(this.mesh);
            },
            update: function() {
                if (this.active === true) {
                    // update bullet from position vector towards direction vector
                    this.mesh.position.x += this.speedX;
                    this.mesh.position.y += this.speedY;

                    // check offscreen (just sides)
                    // if so, inactivate, remove from array and remove from scene
                    if (this.mesh.position.x >  $container.width()/2 ||
                        this.mesh.position.x < -$container.width()/2) {
                        this.active = false;
                        splice(MM.bullets,this);
                        scene.remove(this.mesh);
                        return;
                    }

                    /*
                      collision detection:
                      -- poor man collision checking origin of bullet with bounding box of
                      -- enemy instead of the ray... Three.js intersection isn't being very
                      -- helpful at the moment.
                    */
                    // iterate active enemies
                    for (var j=0; j<MM.enemies.length;j++) {
                        var enemy = MM.enemies[j];
                        if (enemy.active) {
                            var bb = enemy.geometry.boundingBox;
                            var hit = false, dead = false;
//                            console.debug(this.mesh.position);
//                            console.debug(bb.min);
                            if (this.mesh.position.x < enemy.mesh.position.x+bb.max.x+this.radius/2 &&
                                this.mesh.position.x > enemy.mesh.position.x+bb.min.x-this.radius/2 &&
                                this.mesh.position.y < enemy.mesh.position.y+bb.max.y+this.radius/2 &&
                                this.mesh.position.y > enemy.mesh.position.y+bb.min.y-this.radius/2) {
                                console.debug("hit");
                                hit = true;
                            }

                            if (hit) {
                                // decrement life
                                enemy.life -= this.damage;
                                if (enemy.life <= 0) {
                                    dead = true;
                                }

                                // remove bullet
                                this.active = false;
                                splice(MM.bullets,this);
                                scene.remove(this.mesh);
                            }

                            // killed the enemy, remove
                            if (dead) {
                                enemy.active = false;
                                splice(MM.enemies,enemy);
                                scene.remove(enemy.mesh)
                                $("#game-kills").text(++MM.kills);
                                break;
                            }
                        }
                    }
/*
	            for (var i=0; i<this.mesh.geometry.vertices.length; i++) {
                        // THREE raycaster not working :(
		        var localVertex = this.mesh.geometry.vertices[i].clone();
		        var globalVertex = localVertex.applyMatrix4(this.mesh.matrix);
		        var direction = globalVertex.sub(this.mesh.position);
                        var ray = new THREE.Raycaster(this.originPoint, direction.clone().normalize());
//                        if (i ==0)
//                            console.debug(ray);
//		        var collisions = ray.intersectObjects(scene.children); //MM.enemies);
//		        var collisions = ray.intersectObjects(MM.enemies);

//                        console.debug(collisions);

                        var collisions = [];
		        if (collisions.length > 0) {
                            console.debug("hit 1");
                            if (collisions[0].distance < direction.length()) {
                                console.debug("hit 2");
                            }
                        }
	            }	
*/

                }
            }
        }.init();
    }

    function createTriangleEnemy(pos) {
        var e = {
            "name":"enemy",
            "active":true,
            "pos":pos,
            "life":20,
            "damage":0.05,
            "speed":5,
            "radius":20,
            init: function() {
                this.geometry = new THREE.CircleGeometry(this.radius,3);
                this.material = new THREE.MeshBasicMaterial({color:0x00ff00,wireframe:false});
                this.mesh = new THREE.Mesh(this.geometry, this.material);
                this.mesh.position.set(this.pos.x,this.pos.y,0);
                this.geometry.computeBoundingBox();
                this.homeside = 0-$container.width()/2+MM.home.width+this.radius/2,
                MM.enemies.push(this);
                /*
                  if (DEBUG) {
                  console.debug(this.mesh.position);
                  console.debug(this.geometry.boundingBox.min);
                  console.debug(this.geometry.boundingBox.max);
                  for (var i=0;i<this.geometry.vertices.length;i++) {
                  console.debug(this.geometry.vertices[i]);
                  }
                  }
                */
            },
            update: function() {
                if (this.active === true) {
                    this.mesh.position.x -= this.speed;
                    // check if hitting home
                    if (this.mesh.position.x <= this.homeside) {
                        this.mesh.position.x = this.homeside;
                        MM.home.life -= this.damage;
                        
                        $("#game-life").text(Math.round(MM.home.life) + "%");
                        if (MM.home.life <= 0) {
                            $("#game-life").text("DEAD!");
                            console.debug('dead');
                        }
                        return;
                    }

                    // TODO: check if hitting home
                }
            }
        }.init();
    }


    /**********
     * animation, updating, and rendering
     **********/
    function animate() {
        requestAnimationFrame(animate);
        //	handleKeys();
        update();
	render();
        if (DEBUG) stats.update();
    }

    function update() {
        // render active enemy objects
        for (var i=0; i<MM.enemies.length; i++) {
            var obj = MM.enemies[i];
            // update enemy position vector
            obj.update();
        }

        // render active bullet objects
        for (var i=0; i<MM.bullets.length; i++) {
            var obj = MM.bullets[i];
            obj.update();
        }
        
    }

    function render() {


        // render the scene!
        renderer.render(scene,camera);
    }
});
