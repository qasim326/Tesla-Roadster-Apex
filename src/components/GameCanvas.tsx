import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { soundEngine } from '../audio/soundEngine';
import { createRoadsterRig } from '../three/carBuilder';
import { createProceduralTextures } from '../three/textures';
import {
  CAR_HALF_WIDTH,
  ROAD_HALF_WIDTH,
  createWorldManager,
} from '../three/worldManager';
import { getStageMeta } from '../data/missionsAndCampaign';
import {
  CampaignStageId,
  CarSpec,
  GameMode,
  HudCallout,
  HudState,
  PlayMode,
  StudioTab,
  WEATHER_CONFIGS,
  WeatherCondition,
} from '../types/game';

export interface TouchControlsState {
  left: boolean;
  right: boolean;
  accel: boolean;
  brake: boolean;
  jump: boolean;
  surge: boolean;
  flip: boolean;
}

interface GameCanvasProps {
  mode: GameMode;
  playMode: PlayMode;
  campaignStage: CampaignStageId;
  carSpec: CarSpec;
  weather: WeatherCondition;
  studioOpen: boolean;
  studioTab: StudioTab;
  runNonce: number;
  touchRef: React.MutableRefObject<TouchControlsState>;
  pendingMissionBonusRef: React.MutableRefObject<number>;
  onHudUpdate: (hud: HudState) => void;
  onGameOver: (finalHud: HudState) => void;
  onStageComplete: (finalHud: HudState) => void;
  onContextLostChange?: (lost: boolean) => void;
}

const _camPos = new THREE.Vector3();
const _camTarget = new THREE.Vector3();
const _targetPos = new THREE.Vector3();
const _targetLook = new THREE.Vector3();
const _targetFogColor = new THREE.Color();
const _targetKeyColor = new THREE.Color();

export const GameCanvas: React.FC<GameCanvasProps> = ({
  mode,
  playMode,
  campaignStage,
  carSpec,
  weather,
  studioOpen,
  studioTab,
  runNonce,
  touchRef,
  pendingMissionBonusRef,
  onHudUpdate,
  onGameOver,
  onStageComplete,
  onContextLostChange,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const modeRef = useRef<GameMode>(mode);
  const playModeRef = useRef<PlayMode>(playMode);
  const campaignStageRef = useRef<CampaignStageId>(campaignStage);
  const specRef = useRef<CarSpec>(carSpec);
  const weatherRef = useRef<WeatherCondition>(weather);
  const studioOpenRef = useRef<boolean>(studioOpen);
  const studioTabRef = useRef<StudioTab>(studioTab);
  const onHudUpdateRef = useRef(onHudUpdate);
  const onGameOverRef = useRef(onGameOver);
  const onStageCompleteRef = useRef(onStageComplete);
  const onContextLostRef = useRef(onContextLostChange);

  const rigApplySpecRef = useRef<((spec: CarSpec) => void) | null>(null);
  const resetRunFnRef = useRef<(() => void) | null>(null);
  const resetShowroomFnRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    modeRef.current = mode;
    if (mode === 'title') {
      resetShowroomFnRef.current?.();
    }
  }, [mode]);

  useEffect(() => {
    playModeRef.current = playMode;
  }, [playMode]);

  useEffect(() => {
    campaignStageRef.current = campaignStage;
  }, [campaignStage]);

  useEffect(() => {
    specRef.current = carSpec;
    rigApplySpecRef.current?.(carSpec);
  }, [carSpec]);

  useEffect(() => {
    weatherRef.current = weather;
  }, [weather]);

  useEffect(() => {
    studioOpenRef.current = studioOpen;
  }, [studioOpen]);

  useEffect(() => {
    studioTabRef.current = studioTab;
  }, [studioTab]);

  useEffect(() => {
    onHudUpdateRef.current = onHudUpdate;
    onGameOverRef.current = onGameOver;
    onStageCompleteRef.current = onStageComplete;
    onContextLostRef.current = onContextLostChange;
  }, [onHudUpdate, onGameOver, onStageComplete, onContextLostChange]);

  useEffect(() => {
    if (runNonce > 0) {
      resetRunFnRef.current?.();
    }
  }, [runNonce]);

  useEffect(() => {
    const mount = containerRef.current;
    if (!mount) return;

    // 1. Software WebGL Guard
    const isSoftwareGl = (() => {
      const probe = document.createElement('canvas').getContext('webgl2');
      if (!probe) return true;
      const ext = probe.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
      const gpu = String(probe.getParameter(param));
      probe.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // 2. Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setPixelRatio(
      isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2),
    );
    renderer.setSize(
      mount.clientWidth || window.innerWidth,
      mount.clientHeight || window.innerHeight,
    );
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    mount.appendChild(renderer.domElement);

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      onContextLostRef.current?.(true);
    };
    const handleContextRestored = () => {
      onContextLostRef.current?.(false);
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', handleContextRestored);

    // 3. Scene, Environment & Fog
    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
    const textures = createProceduralTextures(maxAnisotropy);

    const scene = new THREE.Scene();
    scene.background = textures.skyBackdrop;
    const fog = new THREE.FogExp2(0x060b14, 0.0044);
    scene.fog = fog;

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envRT = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envRT.texture;
    pmremGenerator.dispose();

    // 4. Camera (car framed squarely in the middle of the lobby viewport)
    const width = mount.clientWidth || window.innerWidth;
    const height = mount.clientHeight || window.innerHeight;
    const camera = new THREE.PerspectiveCamera(48, width / height, 0.2, 420);
    camera.position.set(-4.15, 1.88, -4.95);
    camera.lookAt(-0.1, 0.66, 0.1);

    // 5. Three-Point Studio + Highway Lighting
    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x261d14, 0.95);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff4e0, 2.4);
    keyLight.position.set(-14, 24, -14);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.width = isSoftwareGl ? 1024 : 2048;
    keyLight.shadow.mapSize.height = isSoftwareGl ? 1024 : 2048;
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 75;
    const d = 16;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.bias = -0.0004;
    keyLight.shadow.normalBias = 0.02;
    if (!isSoftwareGl) {
      keyLight.shadow.radius = 2.5;
    }
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x22d3ee, 1.45);
    rimLight.position.set(16, 10, 14);
    scene.add(rimLight);

    if (!isSoftwareGl) {
      RectAreaLightUniformsLib.init();
      const studioSoftbox = new THREE.RectAreaLight(0xffffff, 2.6, 8, 3.5);
      studioSoftbox.position.set(-2.5, 5.2, -1.5);
      studioSoftbox.lookAt(0, 0.6, 0);
      scene.add(studioSoftbox);
    }

    // 6. World & Car Rig
    const world = createWorldManager(textures);
    scene.add(world.group);

    const carRig = createRoadsterRig(textures, isSoftwareGl);
    scene.add(carRig.root);
    rigApplySpecRef.current = carRig.applySpec;
    carRig.applySpec(specRef.current);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // 7. Mutable Physics & Gameplay State
    const keys = {
      left: false,
      right: false,
      accel: false,
      brake: false,
      jump: false,
      surge: false,
    };
    let jumpJustPressed = false;
    let surgeJustPressed = false;
    let queuedFlipKind: 'backflip' | 'rollLeft' | 'rollRight' | null = null;

    const physics = {
      x: 0,
      vx: 0,
      y: 0,
      vy: 0,
      speedMps: 76, // ~274 km/h cruising baseline
      distanceM: 0,
      score: 0,
      elapsedSeconds: 0,
      sprint1KmSec: null as number | null,
      coldGasPct: 100,
      shields: 3,
      invulnTimer: 0,
      surgePadTimer: 0,
      gapsCleared: 0,
      topSpeedKmh: 0,
      shake: 0,
      suspensionOffsetY: 0,
      suspensionVelY: 0,
      wheelSpinAngle: 0,
      wasAirborne: false,
      flipAxis: 'none' as 'none' | 'pitch' | 'roll',
      flipDir: 1,
      flipProgress: 0,
      flipChainCount: 0,
      stuntPitch: 0,
      stuntRoll: 0,
      callout: null as HudCallout | null,
      calloutId: 0,
      calloutTimer: 0,
      orbsCollected: 0,
      nearMisses: 0,
      thrusterActivations: 0,
      laneSwitches: 0,
      lastLaneIdx: 1,
      boostOvertakes: 0,
      zeroDamageDistM: 0,
      zeroDamageTimeSec: 0,
      wasSurgeBoost: false,
      wasColdGasBoost: false,
      runEnded: false,
    };

    const getLaneIdx = (xVal: number): number => {
      if (xVal < -3.4) return 0;
      if (xVal < 0) return 1;
      if (xVal < 3.4) return 2;
      return 3;
    };

    const setCallout = (text: string, tone: HudCallout['tone']) => {
      physics.calloutId += 1;
      physics.callout = { text, tone, id: physics.calloutId };
      physics.calloutTimer = 1.35;
    };

    const initShowroomPose = () => {
      world.resetForShowroom();
      physics.x = 0;
      physics.y = 0;
      physics.vx = 0;
      physics.vy = 0;
      physics.suspensionOffsetY = 0;
      physics.runEnded = false;
      carRig.root.visible = true;
      carRig.root.position.set(0, 0, 0);
      carRig.root.rotation.set(0, 0, 0);
      carRig.stuntGroup.rotation.set(0, 0, 0);
      carRig.setSuspension(0, 0, 0);
      carRig.wheelPivots.fl.rotation.y = 0;
      carRig.wheelPivots.fr.rotation.y = 0;
    };

    const initPlayRun = () => {
      world.setStageConfig(playModeRef.current, campaignStageRef.current);
      world.resetForPlay();
      physics.x = 0;
      physics.vx = 0;
      physics.y = 0;
      physics.vy = 0;
      physics.speedMps = 78; // ~280 km/h launch speed
      physics.distanceM = 0;
      physics.score = 0;
      physics.elapsedSeconds = 0;
      physics.sprint1KmSec = null;
      physics.coldGasPct = 100;
      physics.shields = 3;
      physics.invulnTimer = 0;
      physics.surgePadTimer = 0;
      physics.gapsCleared = 0;
      physics.topSpeedKmh = 280;
      physics.shake = 0;
      physics.suspensionOffsetY = 0;
      physics.suspensionVelY = 0;
      physics.wasAirborne = false;
      physics.flipAxis = 'none';
      physics.flipDir = 1;
      physics.flipProgress = 0;
      physics.flipChainCount = 0;
      physics.stuntPitch = 0;
      physics.stuntRoll = 0;
      physics.callout = null;
      physics.calloutTimer = 0;
      physics.orbsCollected = 0;
      physics.nearMisses = 0;
      physics.thrusterActivations = 0;
      physics.laneSwitches = 0;
      physics.lastLaneIdx = getLaneIdx(0);
      physics.boostOvertakes = 0;
      physics.zeroDamageDistM = 0;
      physics.zeroDamageTimeSec = 0;
      physics.wasSurgeBoost = false;
      physics.wasColdGasBoost = false;
      physics.runEnded = false;
      queuedFlipKind = null;
      pendingMissionBonusRef.current = 0;

      carRig.root.visible = true;
      carRig.root.position.set(0, 0, 0);
      carRig.root.rotation.set(0, 0, 0);
      carRig.stuntGroup.rotation.set(0, 0, 0);
      carRig.setSuspension(0, 0, 0);
      carRig.wheelPivots.fl.rotation.y = 0;
      carRig.wheelPivots.fr.rotation.y = 0;
    };

    resetShowroomFnRef.current = initShowroomPose;
    resetRunFnRef.current = initPlayRun;

    initShowroomPose();
    _camPos.set(-4.15, 1.88, -4.95);
    _camTarget.set(-0.1, 0.66, 0.1);
    camera.position.copy(_camPos);
    camera.lookAt(_camTarget);

    // 8. Keyboard Input
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') keys.left = true;
      if (e.code === 'KeyD' || e.code === 'ArrowRight') keys.right = true;
      if (e.code === 'KeyW' || e.code === 'ArrowUp') {
        if (modeRef.current === 'playing') e.preventDefault();
        keys.accel = true;
      }
      if (e.code === 'KeyS' || e.code === 'ArrowDown') {
        if (modeRef.current === 'playing') e.preventDefault();
        keys.brake = true;
      }
      if (e.code === 'Space') {
        if (modeRef.current === 'playing') e.preventDefault();
        if (!keys.jump) jumpJustPressed = true;
        keys.jump = true;
      }
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        if (!keys.surge) surgeJustPressed = true;
        keys.surge = true;
      }
      if (e.code === 'KeyF' && !e.repeat) {
        queuedFlipKind = 'backflip';
      }
      if (e.code === 'KeyQ' && !e.repeat) {
        queuedFlipKind = 'rollLeft';
      }
      if (e.code === 'KeyE' && !e.repeat) {
        queuedFlipKind = 'rollRight';
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') keys.left = false;
      if (e.code === 'KeyD' || e.code === 'ArrowRight') keys.right = false;
      if (e.code === 'KeyW' || e.code === 'ArrowUp') keys.accel = false;
      if (e.code === 'KeyS' || e.code === 'ArrowDown') keys.brake = false;
      if (e.code === 'Space') keys.jump = false;
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') keys.surge = false;
    };

    const onBlur = () => {
      keys.left = false;
      keys.right = false;
      keys.accel = false;
      keys.brake = false;
      keys.jump = false;
      keys.surge = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);

    // 9. Resize Handler
    const onResize = () => {
      if (!mount) return;
      const w = mount.clientWidth || window.innerWidth;
      const h = mount.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // 10. Main Loop (Never return early before scheduling next frame!)
    let frameId = 0;
    let disposed = false;
    let lastTime = performance.now();
    let hudEmitTimer = 0;
    let lobbyTime = 0;
    let lastWeather: WeatherCondition = weatherRef.current;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (!gl || typeof gl.fenceSync !== 'function') {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    const computeStageProgress = (stageId: CampaignStageId): { progress: number; target: number; timeLeft: number | null } => {
      const meta = getStageMeta(stageId);
      if (meta.goalKind === 'distance_timed') {
        return {
          progress: Math.floor(physics.distanceM),
          target: meta.targetValue,
          timeLeft: meta.timeLimitSec !== null ? Math.max(0, meta.timeLimitSec - physics.elapsedSeconds) : null,
        };
      }
      if (meta.goalKind === 'fuel_cells') {
        return { progress: physics.orbsCollected, target: meta.targetValue, timeLeft: null };
      }
      if (meta.goalKind === 'overtakes') {
        return { progress: physics.boostOvertakes, target: meta.targetValue, timeLeft: null };
      }
      return {
        progress: Math.floor(physics.distanceM),
        target: meta.targetValue,
        timeLeft: null,
      };
    };

    const buildHudSnapshot = (
      speedKmh: number,
      coldGasActive: boolean,
      surgeActive: boolean,
      isAirborne: boolean,
      gameOverReason: HudState['gameOverReason'],
    ): HudState => {
      const st = computeStageProgress(campaignStageRef.current);
      return {
        score: Math.floor(physics.score),
        distanceKm: Number((physics.distanceM / 1000).toFixed(2)),
        speedKmh,
        elapsedSeconds: Number(physics.elapsedSeconds.toFixed(2)),
        sprint1KmSec: physics.sprint1KmSec,
        coldGasPct: Math.round(physics.coldGasPct),
        coldGasActive,
        surgeActive,
        isAirborne,
        shields:
          gameOverReason === 'wrecked' || gameOverReason === 'lava_fall'
            ? 0
            : physics.shields,
        maxShields: 3,
        gapsCleared: physics.gapsCleared,
        topSpeedKmh: physics.topSpeedKmh,
        weather: weatherRef.current,
        callout:
          gameOverReason === 'wrecked'
            ? { text: 'CHASSIS WRECKED', tone: 'red', id: physics.calloutId + 1 }
            : gameOverReason === 'lava_fall'
              ? { text: 'LAVA BREACH', tone: 'red', id: physics.calloutId + 1 }
              : gameOverReason === 'time_expired'
                ? { text: 'TIME EXPIRED', tone: 'red', id: physics.calloutId + 1 }
                : physics.callout,
        gameOverReason,
        playMode: playModeRef.current,
        campaignStage: campaignStageRef.current,
        stageProgress: st.progress,
        stageTarget: st.target,
        stageTimeLeftSec: st.timeLeft,
        orbsCollected: physics.orbsCollected,
        nearMisses: physics.nearMisses,
        thrusterActivations: physics.thrusterActivations,
        laneSwitches: physics.laneSwitches,
        boostOvertakes: physics.boostOvertakes,
        zeroDamageDistM: Math.floor(physics.zeroDamageDistM),
        zeroDamageTimeSec: Number(physics.zeroDamageTimeSec.toFixed(1)),
      };
    };

    const triggerGameOver = (
      reason: 'wrecked' | 'viaduct_fall' | 'lava_fall' | 'time_expired',
      speedKmh: number,
      isAirborne: boolean,
    ) => {
      if (physics.runEnded) return;
      physics.runEnded = true;
      soundEngine.playGameOver();
      soundEngine.updateContinuous({
        playing: false,
        speedKmh: 0,
        coldGasActive: false,
        surgeActive: false,
        isAirborne: false,
      });
      const finalHud = buildHudSnapshot(speedKmh, false, false, isAirborne, reason);
      onHudUpdateRef.current(finalHud);
      onGameOverRef.current(finalHud);
    };

    const triggerStageComplete = (speedKmh: number, isAirborne: boolean) => {
      if (physics.runEnded) return;
      physics.runEnded = true;
      const meta = getStageMeta(campaignStageRef.current);
      physics.score += meta.rewardPts;
      soundEngine.playStageVictory();
      soundEngine.updateContinuous({
        playing: false,
        speedKmh: 0,
        coldGasActive: false,
        surgeActive: false,
        isAirborne: false,
      });
      const finalHud = buildHudSnapshot(speedKmh, false, false, isAirborne, null);
      onHudUpdateRef.current(finalHud);
      onStageCompleteRef.current(finalHud);
    };

    const tick = () => {
      if (disposed) return;

      const now = performance.now();
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(Math.max(rawDt, 0.001), 0.05);

      const currentMode = modeRef.current;
      const isStudio = studioOpenRef.current;
      const tab = studioTabRef.current;
      const activeWeather = weatherRef.current;
      const weatherCfg = WEATHER_CONFIGS[activeWeather];

      if (activeWeather !== lastWeather) {
        lastWeather = activeWeather;
        if (currentMode === 'playing' && !physics.runEnded) {
          if (activeWeather === 'rainy') {
            setCallout('STORM RAIN · LOW GRIP', 'cyan');
          } else if (activeWeather === 'foggy') {
            setCallout('DENSE FOG · LOW VISIBILITY', 'amber');
          } else {
            setCallout('CLEAR NIGHT · MAX GRIP', 'amber');
          }
        }
      }

      // Smooth Dynamic Weather & Mars Campaign Atmosphere
      const isMarsTheme =
        currentMode !== 'title' &&
        playModeRef.current === 'campaign' &&
        campaignStageRef.current === 5;
      _targetFogColor.setHex(isMarsTheme ? 0x3b150e : weatherCfg.fogColorHex);
      fog.color.lerp(_targetFogColor, 1 - Math.exp(-3.0 * dt));
      fog.density = THREE.MathUtils.damp(
        fog.density,
        isMarsTheme ? 0.0062 : weatherCfg.fogDensity,
        3.0,
        dt,
      );
      _targetKeyColor.setHex(isMarsTheme ? 0xffb38a : 0xfff4e0);
      keyLight.color.lerp(_targetKeyColor, 1 - Math.exp(-3.0 * dt));

      const targetHemi = activeWeather === 'rainy' ? 0.68 : activeWeather === 'foggy' ? 1.15 : 0.95;
      const targetKey = activeWeather === 'rainy' ? 1.65 : activeWeather === 'foggy' ? 1.05 : 2.35;
      const targetRim = activeWeather === 'rainy' ? 1.9 : activeWeather === 'foggy' ? 0.85 : 1.45;
      const targetExposure = activeWeather === 'rainy' ? 1.04 : activeWeather === 'foggy' ? 0.98 : 1.12;

      hemiLight.intensity = THREE.MathUtils.damp(hemiLight.intensity, targetHemi, 3.0, dt);
      keyLight.intensity = THREE.MathUtils.damp(keyLight.intensity, targetKey, 3.0, dt);
      rimLight.intensity = THREE.MathUtils.damp(rimLight.intensity, targetRim, 3.0, dt);
      renderer.toneMappingExposure = THREE.MathUtils.damp(
        renderer.toneMappingExposure,
        targetExposure,
        3.0,
        dt,
      );

      if (currentMode === 'title') {
        // Centered Rolling Highway Lobby: vehicle cruises squarely in the center of the viaduct & viewport
        lobbyTime += dt;
        const lobbySpeedMps = 42; // ~151 km/h smooth rolling showcase
        world.updateLobbyCruise(dt, lobbySpeedMps);
        world.updateWeatherVisuals(activeWeather, lobbySpeedMps, dt);

        const weaveX = Math.sin(lobbyTime * 0.45) * 0.28;
        const weaveVx = Math.cos(lobbyTime * 0.45) * 0.28 * 0.45;
        const microBob = Math.sin(lobbyTime * 8.5) * 0.008;

        carRig.root.visible = true;
        carRig.root.position.set(weaveX, 0, 0);
        carRig.root.rotation.set(0, -weaveVx * 0.05, -weaveVx * 0.02);
        carRig.setSuspension(microBob, 0, 0);

        physics.wheelSpinAngle -= (lobbySpeedMps / 0.38) * dt;
        carRig.wheelSpinners.forEach((ws) => {
          ws.rotation.x = physics.wheelSpinAngle;
        });
        carRig.wheelPivots.fl.rotation.y = -weaveVx * 0.09;
        carRig.wheelPivots.fr.rotation.y = -weaveVx * 0.09;

        const previewRear = isStudio && tab === 'thrusters';

        if (previewRear) {
          _targetPos.set(weaveX + 2.8, 1.5, 4.4);
          _targetLook.set(weaveX, 0.7, 0);
          world.spawnThrusterParticles(
            weaveX,
            0.05,
            0,
            0,
            1.15,
            specRef.current.thrusterColor,
            dt,
          );
          carRig.thrusterLight.intensity = isSoftwareGl ? 3.2 : 5.5;
        } else if (isStudio) {
          // Shift look target slightly below car center so car sits nicely in upper-middle above bottom studio drawer
          _targetPos.set(weaveX - 4.1, 1.85, -4.55);
          _targetLook.set(weaveX, 0.35, 0);
          carRig.thrusterLight.intensity = isSoftwareGl ? 1.5 : 2.8;
        } else {
          // Centered hero showcase framing right in the middle of the screen
          const orbitSway = Math.sin(lobbyTime * 0.32) * 0.28;
          _targetPos.set(weaveX - 4.15 + orbitSway, 1.88, -4.95);
          _targetLook.set(weaveX - 0.1, 0.66, 0.1);
          carRig.thrusterLight.intensity = isSoftwareGl ? 1.5 : 2.8;
        }

        _camPos.x = THREE.MathUtils.damp(_camPos.x, _targetPos.x, 4.5, dt);
        _camPos.y = THREE.MathUtils.damp(_camPos.y, _targetPos.y, 4.5, dt);
        _camPos.z = THREE.MathUtils.damp(_camPos.z, _targetPos.z, 4.5, dt);
        _camTarget.x = THREE.MathUtils.damp(_camTarget.x, _targetLook.x, 4.5, dt);
        _camTarget.y = THREE.MathUtils.damp(_camTarget.y, _targetLook.y, 4.5, dt);
        _camTarget.z = THREE.MathUtils.damp(_camTarget.z, _targetLook.z, 4.5, dt);

        camera.position.copy(_camPos);
        camera.lookAt(_camTarget);
        camera.fov = THREE.MathUtils.damp(camera.fov, 46, 5, dt);
        camera.updateProjectionMatrix();

        if (activeWeather === 'rainy') {
          world.spawnTireSpray(weaveX, lobbySpeedMps, dt);
        }
        world.updateParticles(dt, lobbySpeedMps, specRef.current.thrusterColor);
        soundEngine.updateContinuous({
          playing: false,
          speedKmh: 0,
          coldGasActive: false,
          surgeActive: false,
          isAirborne: false,
          previewThruster: previewRear,
          weather: activeWeather,
        });
      } else if (currentMode === 'playing' && !physics.runEnded) {
        if (pendingMissionBonusRef.current > 0) {
          physics.score += pendingMissionBonusRef.current;
          pendingMissionBonusRef.current = 0;
        }

        const tControls = touchRef.current;
        const steerLeft = keys.left || tControls.left;
        const steerRight = keys.right || tControls.right;
        const holdAccel = keys.accel || tControls.accel;
        const holdBrake = keys.brake || tControls.brake;
        const holdJump = keys.jump || tControls.jump;
        const holdSurge = keys.surge || tControls.surge;

        // 1. Weather-Aware Road Grip & Steering Physics
        const steerInput = (steerRight ? 1 : 0) - (steerLeft ? 1 : 0);
        const lateralTopSpeed = activeWeather === 'rainy' ? 13.4 : 14.2;
        const targetVx = steerInput * lateralTopSpeed;
        physics.vx = THREE.MathUtils.damp(physics.vx, targetVx, weatherCfg.steerDamp, dt);
        physics.x += physics.vx * dt;

        const maxRoadX = ROAD_HALF_WIDTH - CAR_HALF_WIDTH;
        if (physics.x < -maxRoadX) {
          physics.x = -maxRoadX;
          physics.vx = Math.max(0, physics.vx);
        } else if (physics.x > maxRoadX) {
          physics.x = maxRoadX;
          physics.vx = Math.min(0, physics.vx);
        }

        const curLaneIdx = getLaneIdx(physics.x);
        if (curLaneIdx !== physics.lastLaneIdx) {
          physics.lastLaneIdx = curLaneIdx;
          physics.laneSwitches += 1;
        }

        // 2. Throttle (W), Weather-Affected Braking (S) & Surge Boost (Shift) Speed Physics
        if (physics.surgePadTimer > 0) physics.surgePadTimer -= dt;
        const wantSurge =
          (holdSurge && physics.coldGasPct > 3) || physics.surgePadTimer > 0;

        if (surgeJustPressed && wantSurge) {
          soundEngine.playSurgeEngage();
        }
        surgeJustPressed = false;

        const baseCruiseMps =
          Math.min(92, 74 + physics.distanceM * 0.005) * weatherCfg.dragFactor;
        let targetSpeedMps = baseCruiseMps;
        let accelDamp = 1.8;

        if (wantSurge) {
          targetSpeedMps = Math.max(146, baseCruiseMps + 56);
          accelDamp = 4.6;
        } else if (holdBrake) {
          targetSpeedMps = activeWeather === 'rainy' ? 42 : 34;
          accelDamp = weatherCfg.brakeDamp;
        } else if (holdAccel) {
          targetSpeedMps = Math.min(126, baseCruiseMps + 36) * weatherCfg.dragFactor;
          accelDamp = activeWeather === 'rainy' ? 2.7 : 3.6;
        }

        physics.speedMps = THREE.MathUtils.damp(
          physics.speedMps,
          targetSpeedMps,
          accelDamp,
          dt,
        );

        const speedKmh = Math.round(physics.speedMps * 3.6);
        if (speedKmh > physics.topSpeedKmh) physics.topSpeedKmh = speedKmh;

        // 3. Hydraulic Jump, Launch Ramps & SpaceX Cold-Gas Thrusters (Spacebar)
        let rampSurfaceY = -10;
        let onRamp = false;
        for (let i = 0; i < world.obstacles.length; i++) {
          const obs = world.obstacles[i];
          if (!obs.active || obs.kind !== 'ramp') continue;
          const dx = Math.abs(obs.x - physics.x);
          if (dx < obs.width * 0.5 + CAR_HALF_WIDTH * 0.72) {
            const t = (obs.z + obs.length * 0.5) / obs.length;
            if (t >= -0.04 && t <= 1.04) {
              const tc = Math.max(0, Math.min(1, t));
              const sy = tc * obs.height;
              if (physics.y <= sy + 0.45) {
                rampSurfaceY = Math.max(rampSurfaceY, sy);
                onRamp = true;
                if (!obs.resolved && t >= 0.85) {
                  obs.resolved = true;
                  physics.vy = Math.max(physics.vy, 13.8 + physics.speedMps * 0.042);
                  physics.speedMps = Math.min(148, physics.speedMps + 8);
                  physics.coldGasPct = Math.min(100, physics.coldGasPct + 18);
                  physics.score += 350;
                  physics.suspensionVelY = 4.6;
                  setCallout('+350 RAMP LAUNCH', 'cyan');
                  soundEngine.playHydraulicJump();
                }
              }
            }
          }
        }

        const overSolid = world.getGroundStateAt(physics.x, 0) === 'solid';
        const grounded = (physics.y <= 0.03 && overSolid) || onRamp;

        if (jumpJustPressed && grounded) {
          physics.vy = onRamp ? Math.max(physics.vy, 15.2) : 12.2;
          physics.y = Math.max(physics.y, 0.08);
          physics.suspensionVelY = 4.0;
          soundEngine.playHydraulicJump();
        }
        jumpJustPressed = false;

        const floorY = onRamp ? rampSurfaceY : 0;
        const isAirborne = physics.y > floorY + 0.12 || (!overSolid && !onRamp);
        let coldGasActive = false;

        // Spacebar activates SpaceX Cold-Gas Thrusters mid-air
        if (holdJump && isAirborne && physics.coldGasPct > 0.5) {
          coldGasActive = true;
          physics.vy += 21.5 * dt;
          if (physics.vy > 7.8) physics.vy = 7.8;
          physics.coldGasPct = Math.max(0, physics.coldGasPct - 30 * dt);
        } else {
          physics.vy -= 26.5 * dt;
        }

        // Count discrete thruster boost activations (Surge or Cold-Gas engage)
        if (wantSurge && !physics.wasSurgeBoost) {
          physics.thrusterActivations += 1;
        }
        if (coldGasActive && !physics.wasColdGasBoost) {
          physics.thrusterActivations += 1;
        }
        physics.wasSurgeBoost = wantSurge;
        physics.wasColdGasBoost = coldGasActive;

        if (wantSurge && !coldGasActive && physics.surgePadTimer <= 0) {
          physics.coldGasPct = Math.max(0, physics.coldGasPct - 11 * dt);
        } else if (!coldGasActive && grounded) {
          physics.coldGasPct = Math.min(100, physics.coldGasPct + 28 * dt);
        }

        physics.y += physics.vy * dt;

        if (onRamp && physics.y <= rampSurfaceY) {
          physics.y = rampSurfaceY;
          physics.vy = Math.max(physics.vy, physics.speedMps * (1.85 / 10.6));
        } else if (overSolid && physics.y <= 0) {
          if (physics.wasAirborne && physics.vy < -3.5) {
            physics.suspensionVelY = -4.2;
            soundEngine.playLanding();
          }
          physics.y = 0;
          physics.vy = 0;
        }

        physics.wasAirborne = isAirborne;

        // Check Lava Pit Dip on Collapsed Side (lose 1 life + recovery bounce unless 0 lives left)
        if (!overSolid && physics.y <= -0.85) {
          if (physics.invulnTimer <= 0) {
            physics.shields -= 1;
            physics.invulnTimer = 1.65;
            physics.shake = 0.8;
            physics.zeroDamageDistM = 0;
            physics.zeroDamageTimeSec = 0;
            world.spawnLavaSplash(physics.x, -1.2, 0);

            if (physics.shields <= 0) {
              triggerGameOver('lava_fall', speedKmh, true);
            } else {
              soundEngine.playShieldHit();
              setCallout('LAVA HIT · -1 LIFE', 'red');
              // Emergency thruster rebound toward intact half of highway
              physics.y = 0.25;
              physics.vy = 10.5;
              physics.vx = physics.x < 0 ? 11.5 : -11.5;
              physics.speedMps = Math.max(54, physics.speedMps * 0.78);
            }
          } else {
            // Brief hover safety during recovery invulnerability
            physics.y = Math.max(physics.y, 0.05);
            physics.vy = Math.max(physics.vy, 3.5);
          }
        }

        if (!physics.runEnded) {
          // Award Collapsed Lava Section Cleared
          const passedLava = world.getPassedLavaSegment(0);
          if (passedLava && !passedLava.lavaClearedAwarded) {
            passedLava.lavaClearedAwarded = true;
            physics.gapsCleared += 1;
            physics.score += 500;
            setCallout('+500 LAVA VAULT', 'amber');
            soundEngine.playBonusChime('gap');
          }

          // 4. Advance Elapsed Time, Distance, Zero-Damage Telemetry & World
          const prevDist = physics.distanceM;
          const prevTime = physics.elapsedSeconds;
          physics.elapsedSeconds += dt;
          physics.distanceM += physics.speedMps * dt;
          physics.zeroDamageDistM += physics.speedMps * dt;
          if (speedKmh >= 260) {
            physics.zeroDamageTimeSec += dt;
          }
          if (physics.sprint1KmSec === null && physics.distanceM >= 1000) {
            const frac =
              physics.distanceM > prevDist
                ? (1000 - prevDist) / (physics.distanceM - prevDist)
                : 1;
            const split = prevTime + frac * dt;
            physics.sprint1KmSec = Number(split.toFixed(2));
            setCallout(`1 KM · ${physics.sprint1KmSec.toFixed(2)}S`, 'cyan');
            soundEngine.playBonusChime('gap');
          }
          physics.score += physics.speedMps * dt * (wantSurge ? 1.85 : holdAccel ? 1.3 : 1.0);

          world.updateWorld(dt, physics.speedMps, physics.distanceM, true);

          // 5. Obstacle Collisions / Orbs / Gates / Mars Finish / Near-Miss / Overtakes
          if (physics.invulnTimer > 0) physics.invulnTimer -= dt;
          if (physics.calloutTimer > 0) {
            physics.calloutTimer -= dt;
            if (physics.calloutTimer <= 0) physics.callout = null;
          }

          for (let i = 0; i < world.obstacles.length; i++) {
            const obs = world.obstacles[i];
            if (!obs.active || obs.kind === 'ramp') continue;

            // Stage 5 Finish Line Arch check
            if (obs.kind === 'finishArch') {
              if (!obs.resolved && obs.z >= -1.2) {
                obs.resolved = true;
                triggerStageComplete(speedKmh, isAirborne);
                break;
              }
              continue;
            }

            // Overtake tracking while boosting
            if (
              !obs.overtaken &&
              (obs.kind === 'sedan' || obs.kind === 'suv' || obs.kind === 'truck') &&
              obs.z > 2.2
            ) {
              obs.overtaken = true;
              if (wantSurge || coldGasActive || physics.speedMps >= 92) {
                physics.boostOvertakes += 1;
              }
            }

            if (obs.resolved) continue;

            const dz = Math.abs(obs.z);
            const dx = Math.abs(obs.x - physics.x);
            const halfW = obs.width * 0.5 + CAR_HALF_WIDTH * 0.82;
            const halfL = obs.length * 0.5 + 1.95;

            if (dz < halfL && dx < halfW) {
              if (obs.kind === 'orb') {
                obs.resolved = true;
                obs.active = false;
                obs.mesh.visible = false;
                physics.orbsCollected += 1;
                physics.score += 50;
                physics.coldGasPct = Math.min(100, physics.coldGasPct + 14);
                soundEngine.playOrbPickup();
                if (
                  playModeRef.current === 'campaign' &&
                  campaignStageRef.current === 2
                ) {
                  setCallout(
                    `FUEL CELL ${physics.orbsCollected} / 30`,
                    'cyan',
                  );
                }
              } else if (obs.kind === 'gate') {
                obs.resolved = true;
                physics.surgePadTimer = 1.6;
                physics.coldGasPct = Math.min(100, physics.coldGasPct + 25);
                physics.score += 400;
                setCallout('+400 SPEED GATE', 'cyan');
                soundEngine.playBonusChime('pad');
              } else if (obs.kind === 'pad') {
                obs.resolved = true;
                physics.coldGasPct = Math.min(100, physics.coldGasPct + 35);
                physics.surgePadTimer = 1.45;
                physics.score += 300;
                setCallout('+300 SURGE PAD', 'cyan');
                soundEngine.playBonusChime('pad');
              } else if (physics.y >= obs.height - 0.16) {
                obs.resolved = true;
                physics.score += 250;
                setCallout('+250 VAULT', 'amber');
                soundEngine.playBonusChime('vault');
              } else if (physics.invulnTimer <= 0) {
                obs.resolved = true;
                obs.active = false;
                obs.mesh.visible = false;
                physics.shields -= 1;
                physics.invulnTimer = 1.35;
                physics.speedMps = Math.max(52, physics.speedMps * 0.7);
                physics.shake = 0.65;
                physics.zeroDamageDistM = 0;
                physics.zeroDamageTimeSec = 0;
                world.spawnImpactSparks(physics.x, physics.y, 0);

                if (physics.shields <= 0) {
                  triggerGameOver('wrecked', speedKmh, isAirborne);
                  break;
                } else {
                  soundEngine.playShieldHit();
                  setCallout('SHIELD IMPACT', 'red');
                }
              }
            } else if (
              !obs.nearMissAwarded &&
              (obs.kind === 'sedan' || obs.kind === 'suv' || obs.kind === 'truck') &&
              dz < halfL + 0.5 &&
              dx >= halfW &&
              dx < halfW + 1.15 &&
              physics.speedMps > 85
            ) {
              obs.nearMissAwarded = true;
              physics.nearMisses += 1;
              physics.score += 100;
              setCallout('+100 NEAR MISS', 'cyan');
              soundEngine.playBonusChime('vault');
            }
          }

          // Campaign Mode Win & Timer Evaluation
          if (!physics.runEnded && playModeRef.current === 'campaign') {
            const meta = getStageMeta(campaignStageRef.current);
            if (meta.goalKind === 'distance_timed') {
              if (physics.distanceM >= meta.targetValue) {
                triggerStageComplete(speedKmh, isAirborne);
              } else if (
                meta.timeLimitSec !== null &&
                physics.elapsedSeconds >= meta.timeLimitSec
              ) {
                triggerGameOver('time_expired', speedKmh, isAirborne);
              }
            } else if (meta.goalKind === 'fuel_cells') {
              if (physics.orbsCollected >= meta.targetValue) {
                triggerStageComplete(speedKmh, isAirborne);
              }
            } else if (meta.goalKind === 'overtakes') {
              if (physics.boostOvertakes >= meta.targetValue) {
                triggerStageComplete(speedKmh, isAirborne);
              }
            } else if (meta.goalKind === 'distance' || meta.goalKind === 'mars_boss') {
              if (physics.distanceM >= meta.targetValue) {
                triggerStageComplete(speedKmh, isAirborne);
              }
            }
          }

          if (!physics.runEnded) {
            // 6. Tesla Roadster SpaceX Mid-Air Flip System (F = Backflip, Q/E = Barrel Roll)
            if (tControls.flip) {
              tControls.flip = false;
              queuedFlipKind = 'backflip';
            }

            if (isAirborne && queuedFlipKind && physics.flipAxis === 'none') {
              physics.flipAxis = queuedFlipKind === 'backflip' ? 'pitch' : 'roll';
              physics.flipDir = queuedFlipKind === 'rollRight' ? -1 : 1;
              physics.flipProgress = 0;
              // RCS cold-gas attitude impulse gives crisp stunt airtime
              physics.vy = Math.max(physics.vy, 6.2);
              soundEngine.playSurgeEngage();
            }
            queuedFlipKind = null;

            if (physics.flipAxis !== 'none') {
              physics.flipProgress += dt * 1.85; // ~0.54s per full 360° flip
              const eased =
                physics.flipProgress < 0.5
                  ? 2 * physics.flipProgress * physics.flipProgress
                  : 1 - Math.pow(-2 * physics.flipProgress + 2, 2) / 2;
              const angle = Math.min(1, eased) * Math.PI * 2 * physics.flipDir;

              if (physics.flipAxis === 'pitch') {
                physics.stuntPitch = angle;
                physics.stuntRoll = 0;
              } else {
                physics.stuntRoll = angle;
                physics.stuntPitch = 0;
              }

              // Extra SpaceX cold-gas RCS burst during flip
              world.spawnThrusterParticles(
                physics.x,
                physics.y + 0.4,
                0,
                physics.stuntPitch,
                1.7,
                specRef.current.thrusterColor,
                dt,
              );

              if (physics.flipProgress >= 1) {
                const wasRoll = physics.flipAxis === 'roll';
                physics.flipAxis = 'none';
                physics.flipProgress = 0;
                physics.stuntPitch = 0;
                physics.stuntRoll = 0;
                physics.flipChainCount += 1;
                const bonus = 750 * physics.flipChainCount;
                physics.score += bonus;
                physics.coldGasPct = Math.min(100, physics.coldGasPct + 25);
                const label =
                  physics.flipChainCount >= 2
                    ? `+${bonus.toLocaleString()} ${physics.flipChainCount}X ROADSTER FLIP`
                    : wasRoll
                      ? '+750 BARREL ROLL'
                      : '+750 SPACEX FLIP';
                setCallout(label, 'cyan');
                soundEngine.playBonusChime('pad');
              }
            } else {
              physics.stuntPitch = THREE.MathUtils.damp(physics.stuntPitch, 0, 14, dt);
              physics.stuntRoll = THREE.MathUtils.damp(physics.stuntRoll, 0, 14, dt);
            }

            if (grounded) {
              physics.flipChainCount = 0;
              if (physics.flipAxis !== 'none') {
                // Auto-level cleanly on touchdown
                physics.flipAxis = 'none';
                physics.flipProgress = 0;
                physics.stuntPitch = 0;
                physics.stuntRoll = 0;
              }
            }

            // 7. Car Visual Transform, Suspension & Wheels
            const targetPitch = onRamp
              ? 0.175
              : coldGasActive
                ? 0.14
                : isAirborne
                  ? Math.max(-0.14, physics.vy * 0.012)
                  : wantSurge
                    ? 0.035
                    : holdBrake
                      ? -0.045
                      : holdAccel
                        ? 0.018
                        : 0;
            const targetRoll = -physics.vx * 0.012;
            const targetYaw = -physics.vx * 0.018;

            carRig.root.position.set(physics.x, physics.y, 0);
            carRig.root.rotation.x = THREE.MathUtils.damp(carRig.root.rotation.x, targetPitch, 9, dt);
            carRig.root.rotation.z = THREE.MathUtils.damp(carRig.root.rotation.z, targetRoll, 10, dt);
            carRig.root.rotation.y = THREE.MathUtils.damp(carRig.root.rotation.y, targetYaw, 10, dt);

            carRig.stuntGroup.rotation.x = physics.stuntPitch;
            carRig.stuntGroup.rotation.z = physics.stuntRoll;

            physics.suspensionVelY += -physics.suspensionOffsetY * 140 * dt;
            physics.suspensionVelY *= Math.exp(-14 * dt);
            physics.suspensionOffsetY += physics.suspensionVelY * dt;
            const wheelDrop = isAirborne ? 0.12 : 0;
            carRig.setSuspension(
              physics.suspensionOffsetY,
              wheelDrop,
              Math.max(0, physics.y - Math.max(0, rampSurfaceY)),
            );

            if (physics.invulnTimer > 0) {
              carRig.root.visible = Math.floor(physics.invulnTimer * 18) % 2 === 0;
            } else {
              carRig.root.visible = true;
            }

            physics.wheelSpinAngle -= (physics.speedMps / 0.38) * dt;
            carRig.wheelSpinners.forEach((ws) => {
              ws.rotation.x = physics.wheelSpinAngle;
            });
            const steerAngle = -physics.vx * 0.025;
            carRig.wheelPivots.fl.rotation.y = steerAngle;
            carRig.wheelPivots.fr.rotation.y = steerAngle;

            // 8. Thruster Particles, Weather Tire Spray & Rain
            world.updateWeatherVisuals(activeWeather, physics.speedMps, dt);
            if (activeWeather === 'rainy' && grounded) {
              world.spawnTireSpray(physics.x, physics.speedMps, dt);
            }

            if (coldGasActive || wantSurge) {
              world.spawnThrusterParticles(
                physics.x,
                physics.y,
                0,
                carRig.root.rotation.x,
                coldGasActive ? 1.5 : 1.2,
                specRef.current.thrusterColor,
                dt,
              );
              carRig.thrusterLight.intensity = isSoftwareGl ? 4.0 : 7.5;
            } else {
              carRig.thrusterLight.intensity = isSoftwareGl ? 1.4 : 2.6;
            }
            world.updateParticles(dt, physics.speedMps, specRef.current.thrusterColor);

            // 9. Chase Camera Follow + FOV Surge + Shake
            if (physics.shake > 0) physics.shake = Math.max(0, physics.shake - dt * 2.4);
            const shakeX = (Math.random() - 0.5) * physics.shake * 0.45;
            const shakeY = (Math.random() - 0.5) * physics.shake * 0.35;

            _targetPos.set(
              physics.x * 0.72 + shakeX,
              2.65 + Math.max(0, physics.y * 0.58) + shakeY,
              7.35 + (wantSurge ? 0.55 : holdBrake ? -0.45 : 0),
            );
            _targetLook.set(physics.x * 0.46, 1.08 + Math.max(0, physics.y * 0.4), -18);

            _camPos.x = THREE.MathUtils.damp(_camPos.x, _targetPos.x, 8.5, dt);
            _camPos.y = THREE.MathUtils.damp(_camPos.y, _targetPos.y, 7.5, dt);
            _camPos.z = THREE.MathUtils.damp(_camPos.z, _targetPos.z, 8.5, dt);
            _camTarget.x = THREE.MathUtils.damp(_camTarget.x, _targetLook.x, 9, dt);
            _camTarget.y = THREE.MathUtils.damp(_camTarget.y, _targetLook.y, 9, dt);
            _camTarget.z = _targetLook.z;

            camera.position.copy(_camPos);
            camera.lookAt(_camTarget);

            const targetFov = wantSurge
              ? 72
              : coldGasActive
                ? 66
                : 55 + Math.max(0, (physics.speedMps - 70) * 0.16);
            camera.fov = THREE.MathUtils.damp(camera.fov, targetFov, 5.5, dt);
            camera.updateProjectionMatrix();

            soundEngine.updateContinuous({
              playing: true,
              speedKmh,
              coldGasActive,
              surgeActive: wantSurge,
              isAirborne,
              weather: activeWeather,
            });

            hudEmitTimer += dt;
            if (hudEmitTimer >= 0.04) {
              hudEmitTimer = 0;
              onHudUpdateRef.current(
                buildHudSnapshot(speedKmh, coldGasActive, wantSurge, isAirborne, null),
              );
            }
          }
        }
      } else {
        // Paused or GameOver: silence continuous engines while keeping scene alive for smooth restart
        world.updateWeatherVisuals(activeWeather, 0, dt);
        world.updateParticles(dt, 0, specRef.current.thrusterColor);
        soundEngine.updateContinuous({
          playing: false,
          speedKmh: 0,
          coldGasActive: false,
          surgeActive: false,
          isAirborne: false,
          weather: activeWeather,
        });
      }

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    if (isSoftwareGl) {
      frameId = window.setTimeout(tick, 16);
    } else {
      frameId = requestAnimationFrame(tick);
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', handleContextRestored);

      carRig.dispose();
      world.dispose();
      textures.dispose();
      envRT.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [touchRef]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full overflow-hidden"
      aria-label="Roadster Apex 3D Highway Viewport"
    />
  );
};
