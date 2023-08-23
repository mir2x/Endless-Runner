window.addEventListener('load', init, false)

var sceneWidth
var sceneHeight
var camera
var scene
var renderer
var dom
var sun
var ground
var orbitControl
var rollingGroundSphere
var ballSphere
var rollingSpeed=0.008
var ballRollingSpeed
var worldRadius=26
var ballRadius=0.2
var sphericalHelper
var pathAngleValues
var ballBaseY=1.8
var bounceValue=0.1
var gravity=0.005
var leftLane=-1
var rightLane=1
var middleLane=0
var currentLane
var clock
var jumping
var treeReleaseInterval=0.5
var lastTreeReleaseTime=0
var treesInPath
var treesPool
var particleGeometry
var particleCount=20
var explosionPower =1.06
var particles
var stats
var scoreText
var score
var hasCollided
var id

function init() {
	createScene()
	update()
}

function createScene(){
	hasCollided=false
	score = 0
	treesInPath = []
	treesPool = []
	
	clock = new THREE.Clock()
	clock.start()

	stats = new Stats()

	ballRollingSpeed = (rollingSpeed * worldRadius / ballRadius) / 5
	sphericalHelper = new THREE.Spherical()
	pathAngleValues = [1.52,1.57,1.62]

    sceneWidth=window.innerWidth
    sceneHeight=window.innerHeight
    
	scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2( 0xf0fff0, 0.14 )
    
	camera = new THREE.PerspectiveCamera( 60, sceneWidth / sceneHeight, 0.1, 1000 )
	camera.position.z = 6.5
	camera.position.y = 3.5
    
	renderer = new THREE.WebGLRenderer({alpha:true})
    renderer.setClearColor(0xfffafa, 1) 
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.setSize( sceneWidth, sceneHeight )
    
	dom = document.getElementById('main')
	dom.appendChild(renderer.domElement)
	dom.appendChild(stats.dom)

	createTreesPool()
	addGround()
	addBall()
	addLight()
	orbitControl()
	addScore()

	window.addEventListener('resize', onWindowResize, false)
	document.onkeydown = handleKeyDown
	
}

function createTreesPool(){
	var maxTreesInPool = 10
	var newTree
	for(var i = 0; i < maxTreesInPool; i++){
		newTree = createTree()
		treesPool.push(newTree)
	}
}

function createTree(){
	var sides = 8
	var tiers = 6
	
	var treeGeometry = new THREE.ConeGeometry( 0.5, 1, sides, tiers)
	var treeMaterial = new THREE.MeshStandardMaterial( { color: 0x33ff33,shading:THREE.FlatShading  } )
	
	var midPointVector = new THREE.Vector3()
	midPointVector = treeGeometry.vertices[0].clone()
	
	var scalarMultiplier = (Math.random()*(0.25-0.1))+0.05
	blowUpTree(treeGeometry.vertices,sides,0,scalarMultiplier)
	tightenTree(treeGeometry.vertices,sides,1)
	blowUpTree(treeGeometry.vertices,sides,2,scalarMultiplier*1.1,true)
	tightenTree(treeGeometry.vertices,sides,3)
	blowUpTree(treeGeometry.vertices,sides,4,scalarMultiplier*1.2)
	tightenTree(treeGeometry.vertices,sides,5)
	
	var treeTop = new THREE.Mesh( treeGeometry, treeMaterial )
	treeTop.castShadow = true
	treeTop.receiveShadow = false
	treeTop.position.y = 0.9
	treeTop.rotation.y = (Math.random()*(Math.PI))
	
	var treeTrunkGeometry = new THREE.CylinderGeometry( 0.1, 0.1,0.5)
	var trunkMaterial = new THREE.MeshStandardMaterial( { color: 0x886633,shading:THREE.FlatShading  } )
	var treeTrunk = new THREE.Mesh( treeTrunkGeometry, trunkMaterial )
	treeTrunk.position.y = 0.25
	
	var tree = new THREE.Object3D()
	tree.add(treeTrunk)
	tree.add(treeTop)
	return tree
}

function blowUpTree(vertices,sides,currentTier,scalarMultiplier,odd){
	var vertexIndex
	var vertexVector= new THREE.Vector3()
	var midPointVector=vertices[0].clone()
	var offset
	for(var i=0; i<sides; i++){
		vertexIndex=(currentTier*sides)+1
		vertexVector=vertices[i+vertexIndex].clone()
		midPointVector.y=vertexVector.y
		offset=vertexVector.sub(midPointVector)
		if(odd){
			if(i%2===0){
				offset.normalize().multiplyScalar(scalarMultiplier/6)
				vertices[i+vertexIndex].add(offset)
			}
			else{
				offset.normalize().multiplyScalar(scalarMultiplier)
				vertices[i+vertexIndex].add(offset)
				vertices[i+vertexIndex].y=vertices[i+vertexIndex+sides].y+0.05
			}
		}
		else{
			if(i%2!==0){
				offset.normalize().multiplyScalar(scalarMultiplier/6)
				vertices[i+vertexIndex].add(offset)
			}
			else{
				offset.normalize().multiplyScalar(scalarMultiplier)
				vertices[i+vertexIndex].add(offset)
				vertices[i+vertexIndex].y=vertices[i+vertexIndex+sides].y+0.05
			}
		}
	}
}

function tightenTree(vertices,sides,currentTier){
	var vertexIndex
	var vertexVector= new THREE.Vector3()
	var midPointVector=vertices[0].clone()
	var offset
	for(var i=0; i<sides; i++){
		vertexIndex=(currentTier*sides)+1
		vertexVector=vertices[i+vertexIndex].clone()
		midPointVector.y=vertexVector.y
		offset=vertexVector.sub(midPointVector)
		offset.normalize().multiplyScalar(0.06)
		vertices[i+vertexIndex].sub(offset)
	}
}

function addGround(){
	var sides=40
	var tiers=40
	
	var sphereGeometry = new THREE.SphereGeometry( worldRadius, sides, tiers)
	var sphereMaterial = new THREE.MeshStandardMaterial( { color: 0xfffafa ,shading:THREE.FlatShading} )
	
	rollingGroundSphere = new THREE.Mesh( sphereGeometry, sphereMaterial )
	rollingGroundSphere.receiveShadow = true
	rollingGroundSphere.castShadow=false
	rollingGroundSphere.rotation.z=-Math.PI/2
	
	scene.add( rollingGroundSphere )

	rollingGroundSphere.position.y=-24
	rollingGroundSphere.position.z=2
	
	addGroundTrees()
}

function addGroundTrees(){
	var numTrees=36
	var gap=6.28/36
	for(var i=0; i<numTrees; i++){
		addTree(false,i*gap, true)
		addTree(false,i*gap, false)
	}
}

function addTree(inPath, row, isLeft){
	var newTree
	if(inPath){
		if(treesPool.length==0)return
		newTree=treesPool.pop()
		newTree.visible=true
		
		treesInPath.push(newTree)
		sphericalHelper.set( worldRadius-0.3, pathAngleValues[row], -rollingGroundSphere.rotation.x+4 )
	}
	else{
		newTree=createTree()
		var forestAreaAngle=0
		if(isLeft){
			forestAreaAngle=1.68+Math.random()*0.1
		}
		else{
			forestAreaAngle=1.46-Math.random()*0.1
		}
		sphericalHelper.set( worldRadius-0.3, forestAreaAngle, row )
	}
	newTree.position.setFromSpherical( sphericalHelper )
	var rollingGroundVector=rollingGroundSphere.position.clone().normalize()
	var treeVector=newTree.position.clone().normalize()
	newTree.quaternion.setFromUnitVectors(treeVector,rollingGroundVector)
	newTree.rotation.x+=(Math.random()*(2*Math.PI/10))+-Math.PI/10
	
	rollingGroundSphere.add(newTree)
}

function addBall(){
	var sphereGeometry = new THREE.DodecahedronGeometry( ballRadius, 1)
	var sphereMaterial = new THREE.MeshStandardMaterial( { color: 0xe5f2f2 ,shading:THREE.FlatShading} )
	
	jumping=false
	
	ballSphere = new THREE.Mesh( sphereGeometry, sphereMaterial )
	ballSphere.receiveShadow = true
	ballSphere.castShadow=true
	scene.add( ballSphere )
	
	ballSphere.position.y=ballBaseY
	ballSphere.position.z=4.8
	
	currentLane=middleLane
	
	ballSphere.position.x=currentLane
}

function addLight(){
	var hemisphereLight = new THREE.HemisphereLight(0xfffafa,0x000000, .9)
	scene.add(hemisphereLight)
	sun = new THREE.DirectionalLight( 0xcdc1c5, 0.9)
	sun.position.set( 12,6,-7 )
	sun.castShadow = true
	scene.add(sun)
	sun.shadow.mapSize.width = 256
	sun.shadow.mapSize.height = 256
	sun.shadow.camera.near = 0.5
	sun.shadow.camera.far = 50 
}

function orbitControl() {
	orbitControl = new THREE.OrbitControls( camera, renderer.domElement )
	orbitControl.addEventListener( 'change', render )
	orbitControl.noKeys = true
	orbitControl.noPan = true
	orbitControl.enableZoom = false
	orbitControl.minPolarAngle = 1.1
	orbitControl.maxPolarAngle = 1.1
	orbitControl.minAzimuthAngle = -0.2
	orbitControl.maxAzimuthAngle = 0.2
}

function addScore(){
	scoreText = document.createElement('h1')
	scoreText.style.position = 'absolute'
	scoreText.style.top = '0%'
	scoreText.style.left = '95%'
	scoreText.innerHTML = "0"
	scoreText.style.backgroundColor = 'rgba(0, 0, 0, 0.7)' 
	scoreText.style.color = '#fff' 
	scoreText.style.padding = '10px' 
	scoreText.style.borderRadius = '10px' 
	scoreText.style.textAlign = 'center'
	document.body.appendChild(scoreText)
}

function handleKeyDown(keyEvent){
	if(jumping)
		return
	var validMove=true

	if ( keyEvent.keyCode === 37) {
		if(currentLane==middleLane){
			currentLane=leftLane
		}
		else if(currentLane==rightLane){
			currentLane=middleLane
		}
		else{
			validMove=false	
		}
	} 

	else if ( keyEvent.keyCode === 39) {
		if(currentLane==middleLane){
			currentLane=rightLane
		}
		else if(currentLane==leftLane){
			currentLane=middleLane
		}
		else{
			validMove=false	
		}
	}

	else{
		if ( keyEvent.keyCode === 38){
			bounceValue=0.12
			jumping=true
		}
		validMove=false
	}
	
	if(validMove){
		jumping = true
		bounceValue = 0.06
	}
}

function update(){
	stats.update()
    rollingGroundSphere.rotation.x += rollingSpeed
    ballSphere.rotation.x -= ballRollingSpeed
    if(ballSphere.position.y<=ballBaseY){
    	jumping=false
    	bounceValue=(Math.random()*0.04)+0.005
    }
    ballSphere.position.y+=bounceValue
    ballSphere.position.x=THREE.Math.lerp(ballSphere.position.x,currentLane, 2*clock.getDelta())//clock.getElapsedTime())
    bounceValue-=gravity
    if(clock.getElapsedTime()>treeReleaseInterval){
    	clock.start()
    	addPathTree()
    	if(!hasCollided){
			score+=2*treeReleaseInterval
			scoreText.innerHTML=score.toString()
		}
    }
    doTreeLogic()
    render()
	
}

function addPathTree(){
	var options=[0,1,2]
	var lane= Math.floor(Math.random()*3)
	addTree(true,lane)
	options.splice(lane,1)
	if(Math.random()>0.5){
		lane= Math.floor(Math.random()*2)
		addTree(true,options[lane])
	}
}

function doTreeLogic(){
	var oneTree
	var treePos = new THREE.Vector3()
	var treesToRemove=[]
	treesInPath.forEach( function ( element, index ) {
		oneTree=treesInPath[ index ]
		treePos.setFromMatrixPosition( oneTree.matrixWorld )
		if(treePos.z > 6 && oneTree.visible){
			treesToRemove.push(oneTree)
		}
		else{
			if(treePos.distanceTo(ballSphere.position)<=0.6) hasCollided=true	
		}
	})
	var fromWhere
	treesToRemove.forEach( function ( element, index ) {
		oneTree=treesToRemove[ index ]
		fromWhere=treesInPath.indexOf(oneTree)
		treesInPath.splice(fromWhere,1)
		treesPool.push(oneTree)
		oneTree.visible=false
	})
}

function render(){
	id = requestAnimationFrame(update)
    renderer.render(scene, camera)
	if(hasCollided) {
		cancelAnimationFrame( id )
		var gameOverText = document.createElement('h1')
		gameOverText.textContent = 'Game Over\nYour score is ' + score
		gameOverText.style.position = 'absolute'
		gameOverText.style.top = '43%'
		gameOverText.style.left = '50%'
		gameOverText.style.transform = 'translate(-50%, -50%)'
		gameOverText.style.backgroundColor = 'rgba(0, 0, 0, 0.7)' 
		gameOverText.style.color = '#fff' 
		gameOverText.style.padding = '20px' 
		gameOverText.style.borderRadius = '10px' 
		gameOverText.style.textAlign = 'center'
		gameOverText.style.whiteSpace = 'pre-line'
		gameOverText.style.lineHeight = '1.5em'
		document.body.appendChild(gameOverText)

		var restartButton2 = document.createElement('button')
  		restartButton2.textContent = 'Restart'
  		restartButton2.style.position = 'absolute'
  		restartButton2.style.top = '55.6%'
  		restartButton2.style.left = '50%'
		restartButton2.style.backgroundColor = 'rgba(0, 0, 0, 0.7)'
		restartButton2.style.color = '#fff'
		restartButton2.style.padding = '10px 20px'
		restartButton2.style.border = 'none'
		restartButton2.style.borderRadius = '5px'
		restartButton2.style.cursor = 'pointer'
  		restartButton2.style.transform = 'translate(-50%, -50%)'
		restartButton2.style.fontSize = '28px' 
  		restartButton2.addEventListener('click', function() {
			location.reload()
		})
  		document.body.appendChild(restartButton2)
	}
}

function onWindowResize() {
	sceneHeight = window.innerHeight
	sceneWidth = window.innerWidth
	renderer.setSize(sceneWidth, sceneHeight)
	camera.aspect = sceneWidth/sceneHeight
	camera.updateProjectionMatrix()
}