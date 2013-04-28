/**************************************
 * Copyright: David Parker
 * Ludum Dare 26: Minimalist Moe
 **************************************/
/**
 * Returns a random number between min and max
 */
function randomArbitrary(min, max) {
    return Math.random() * (max - min) + min;
}
/**
 * Returns a random integer between min and max
 * Using Math.round() will give you a non-uniform distribution!
 */
function randomInt (min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Do everything after jQuery detects DOM is loaded
$(document).ready(function() {
    // Check for webgl
    if (!Detector.webgl) Detector.addGetWebGLMessage();

    // Globals
    var $container=$("#game"), 
    $start=$("#start"),
    $level=$("#level"),
    $pause=$("#pause"),
    $resume=$("#resume"),
    $reset=$("#reset"),
    DEBUG=true,
    mouse={x:0,y:0};

    // Universe
    var stats, camera, scene, projector, renderer, animID;

    // States
    var STATES = {
        STATE_LOADING:"loading",  // before game
        STATE_GAME:"game",        // during game
        STATE_PAUSE:"pause",      // paused game
        STATE_LEVEL:"level",      // between levels
        STATE_GAMEOVER:"gameover",// game over
    }
    
    // Enemy types
    //    [life,damage,speed,radius,corners]
    var ENEMIES = {
        "triangle_easy":[20,0.02,3,20,3],
        "triangle_med":[40,0.05,2,25,3],
        "triangle_hard":[100,0.1,1,30,3],
        "square_easy":[30,0.04,2.8,25,4],
    }

    // Level data
    var LEVELS = [
        // index = level
        // [[types, quantity]]
        // level 0= 3 waves, 5x triangle_easy, 3x triangle_med, 8x triangle_easy
        //        [["triangle_easy",5],["triangle_med",3],["triangle_easy",8],["triangle_hard",1]],
        [["triangle_easy",5],["square_easy",5]],
        [["triangle_easy",5],["triangle_easy",5]],
    ]

    // Minimalist Moe game object
    var MM;

    // Buttons
    $start.click(function() {startGame();return false;});
    $level.click(function() {nextLevel();return false;});
    $pause.click(function() {pauseGame();return false;});
    $resume.click(function(){resumeGame();return false;});
    $reset.click(function() {resetGame();return false;});

    // Ensure shaders are loaded then start
    SL.Shaders.loadedSignal.add(init);

    /*
     * INITIALIZATION
     */
    // All initialization should go here
    function init() {
        initSceneAndCamera();
        initProjector();
        initRenderer();
        initStats();
        initGame();
    }

    /*
     * button event handlers
     */
    function startGame() {
        $start.addClass("hide");
        $pause.removeClass("hide");
        MM.state = STATES.STATE_GAME;
        registerEventListeners();
        addGameObjectsToScene();
        updateUI();
        animate();
    }

    function nextLevel() {
        $level.addClass("hide");
        $pause.removeClass("hide");
        MM.state = STATES.STATE_GAME;
        registerEventListeners();
        addGameObjectsToScene();
    }

    function pauseGame() {
        $pause.addClass("hide");
        $resume.removeClass("hide");
        MM.state = STATES.STATE_PAUSE;
        unregisterEventListeners();
    }
    
    function resumeGame() {
        $resume.addClass("hide");
        $pause.removeClass("hide");
        MM.state = STATES.STATE_GAME;
        registerEventListeners();
    }

    function resetGame() {
        $start.removeClass("hide");
        $pause.addClass("hide");
        $resume.addClass("hide");
        MM.init();
        render();
        cancelAnimationFrame(animID);
        unregisterEventListeners();
    }

    function levelComplete() {
        MM.state = STATES.STATE_LEVEL;
        MM.level++;
        MM.levelTotal = 0;
        MM.levelKills = 0;
        unregisterEventListeners();
        $level.removeClass("hide");
        $pause.addClass("hide");
        $resume.addClass("hide");
        render();
    }

    function gameover() {
        MM.state = STATES.STATE_GAMEOVER;
        $("#game-life").text("DEAD!");
        alert("Game Over! You had a total of " + MM.kills + " kill" + (MM.kills === 1 ? "." : "s."));
        resetGame();
    }

    function registerEventListeners() {
	document.addEventListener('mousedown', mouseDown, false);
    }

    function unregisterEventListeners() {
        document.removeEventListener('mousedown', mouseDown, false);
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
            enemies:[],
            bullets:[],
            init: function() {
                this.reset();
                this.initHome();
                this.initMoe();
                return this;
            },

            reset: function() {
                this.state = STATES.STATE_LOADING;
                this.life = 100;
                this.level = 0;
                this.levelKills = 0;
                this.levelTotal = 0;
                this.kills = 0;
                this.home = null;
                this.moe = null;
                this.resetEnemies();
                this.resetBullets();
                this.enemies = [];
                this.bullets = [];
            },
            resetBullets: function() {
                for (var i=0; i<this.bullets.length; i++) {
                    this.bullets[i].reset();
                }
                this.bullets = [];
                return this.bullets;
            },
            resetEnemies: function() {
                for (var i=0; i<this.enemies.length; i++) {
                    this.enemies[i].reset();
                }
                this.enemies = [];
                return this.enemies;
            },

            // home to defend
            initHome: function() {
                var h = {
                    "name":"home",
                    "active":true,
                    "background":true,
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
        // == level,wave,[enemy,number]
        //    LEVELS[0][0][0] // enemy
        //    LEVELS[0][0][1] // number
        var waves = LEVELS[MM.level];
        MM.levelTotal = 0;
        // for every wave
        for (var i=0; i<waves.length; i++) {
            var wave = waves[i];            // wave data [enemy,number]
            MM.levelTotal += wave[1];
            for (var j=0; j<wave[1]; j++) {
                // get the enemy type for that level
                var enemy = ENEMIES[wave[0]];
                var randT = randomArbitrary(-1,1); //(random +/- for rotation)
                var xSpace = getRandomXSpacing(i,wave[1],j);
                var ySpace = getRandomYSpacing();
                if (ySpace > 0) {
                } else if (ySpace < 0) {
                }
                var pos = new THREE.Vector3(xSpace,ySpace,0.0);

                 // createEnemy(pos,rot,life,damage,speed,radius,corners)
                 createEnemy(pos,randT,enemy);
            }
        }

        for (var i=0; i<MM.enemies.length; i++) {
            if (MM.enemies[i].active === true) {
                scene.add(MM.enemies[i].mesh);
            }
        }
    }

    function getRandomXSpacing(waveNumber,inWave,enemyNumber) {
        var startSpace = $container.width()-100;
        var minXSpace = 75;
        var waveSpace = 250;
        return startSpace+ minXSpace*waveNumber + waveSpace*enemyNumber;
    }

    function getRandomYSpacing() {
        var rand = randomArbitrary(-1,1); // top/bottom
        var randSpace = randomInt(0,5);
        var minYSpace = 50;
        return minYSpace*randSpace*rand;
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
                this.originPoint = MM.moe.mesh.position.clone();
                this.clickPoint = pos;
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
                        this.reset();
                        return;
                    }

                    /*
                      collision detection:
                      -- poor man collision checking origin of bullet with bounding box of
                      -- enemy plus radius instead of the ray... 
                      -- Three.js intersection isn't being very good at the moment.
                    */
                    // iterate active enemies
                    for (var j=0; j<MM.enemies.length;j++) {
                        var enemy = MM.enemies[j];
                        if (enemy.active) {
                            var bb = enemy.geometry.boundingBox;
                            var hit = false;
                            if (this.mesh.position.x < enemy.mesh.position.x+bb.max.x+this.radius/2 &&
                                this.mesh.position.x > enemy.mesh.position.x+bb.min.x-this.radius/2 &&
                                this.mesh.position.y < enemy.mesh.position.y+bb.max.y+this.radius/2 &&
                                this.mesh.position.y > enemy.mesh.position.y+bb.min.y-this.radius/2) {
                                hit = true;
                            }

                            if (hit) {
                                // decrement life
                                enemy.life -= this.damage;
                                if (enemy.life <= 0) {
                                    enemy.reset();
                                    ++MM.kills;
                                    ++MM.levelKills;
                                    updateUI();

                                    // if killed last enemy on level
                                    if (MM.levelKills === MM.levelTotal) {
                                        levelComplete();
                                    }
                                }

                                // remove bullet
                                this.reset();
                                break;
                            }
                        } // active enemy
                    } // for loop
                } // active bullet
            }, // update

            reset: function() {
                this.active = false;
                scene.remove(this.mesh)
            }

        }.init();
    }

    function createEnemy(pos,rot,enemy) {
        var e = {
            "name":"enemy",
            "active":true,
            "pos":pos,
            "rot":rot,
            "life":enemy[0],
            "damage":enemy[1],
            "speed":enemy[2],
            "radius":enemy[3],
            "corners":enemy[4],
            init: function() {
                this.geometry = new THREE.CircleGeometry(this.radius,this.corners);
                this.material = new THREE.MeshBasicMaterial({color:0x00ff00,wireframe:false});
                this.mesh = new THREE.Mesh(this.geometry, this.material);
                this.mesh.position.set(this.pos.x,this.pos.y,0);
                this.geometry.computeBoundingBox();
                this.homeside = 0-$container.width()/2+MM.home.width+this.radius/2,
                MM.enemies.push(this);
            },
            update: function() {
                if (this.active === true) {
                    this.mesh.position.x -= this.speed;
                    this.mesh.rotation.z += (this.rot > 0 ? 0.01 : -0.01);

                    // check if hitting home
                    if (this.mesh.position.x <= this.homeside) {
                        this.mesh.position.x = this.homeside;
                        MM.life -= this.damage;
                        updateUI();

                        // check if dead
                        if (MM.life <= 0) {
                            gameover();
                        }
                        return;
                    }
                } // active enemy
            },
            reset: function() {
                this.active = false;
                scene.remove(this.mesh)
            }
        }.init();
    }

    /**********
     * animation, updating, and rendering
     **********/
    function animate() {
        animID = requestAnimationFrame(animate);
        //	handleKeys();           
        if (MM.state === STATES.STATE_GAME) {
            update();
	    render();
        }

        if (DEBUG) stats.update();
    }

    function update() {
        // update active enemy objects
        for (var i=0; i<MM.enemies.length; i++) {
            MM.enemies[i].update(i);
        }

        // update active bullet objects
        for (var i=0; i<MM.bullets.length; i++) {
            MM.bullets[i].update(i);
        }
    }

    function updateUI() {
        $("#game-life").text(Math.round(MM.life) + "%");
        $("#game-kills").text(MM.kills);
        $("#percent").text(Math.round(MM.levelKills/MM.levelTotal*100) + "%");
    }

    // render the scene!
    function render() {
        renderer.render(scene,camera);
    }
});
