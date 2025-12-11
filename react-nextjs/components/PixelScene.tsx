"use client";

import { useEffect, useRef, useState } from "react";
import { Application, Graphics, Text, TextStyle } from "pixi.js";

export default function PixelScene() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient || !containerRef.current) return;

    const app = new Application();
    let yangbanX = 250;
    let yangbanY = 200;
    let yangbanDirection = 1;
    let frameCount = 0;
    let visitorX = 350;
    let visitorY = 220;
    let visitorDirection = -1;

    const init = async () => {
      await app.init({
        width: 500,
        height: 320,
        backgroundColor: 0x7cb342,
        resolution: 1,
        antialias: false,
      });

      if (containerRef.current) {
        containerRef.current.appendChild(app.canvas);
      }

      // === 잔디 바닥 (타일 패턴) ===
      const grass = new Graphics();
      for (let y = 0; y < 320; y += 16) {
        for (let x = 0; x < 500; x += 16) {
          const shade = (x + y) % 32 === 0 ? 0x7cb342 : 0x8bc34a;
          grass.rect(x, y, 16, 16);
          grass.fill(shade);
        }
      }
      // 잔디 텍스처 (작은 점들)
      for (let i = 0; i < 100; i++) {
        const x = Math.random() * 500;
        const y = Math.random() * 320;
        grass.rect(x, y, 2, 2);
        grass.fill(0x689f38);
      }
      app.stage.addChild(grass);

      // === 흙길 (중앙) ===
      const path = new Graphics();
      // 메인 길
      path.rect(0, 130, 500, 60);
      path.fill(0xd7ccc8);
      // 길 테두리
      path.rect(0, 128, 500, 4);
      path.fill(0xa1887f);
      path.rect(0, 188, 500, 4);
      path.fill(0xa1887f);
      // 길 텍스처
      for (let i = 0; i < 30; i++) {
        const x = Math.random() * 500;
        const y = 135 + Math.random() * 50;
        path.circle(x, y, 2);
        path.fill(0xbcaaa4);
      }
      app.stage.addChild(path);

      // === 세로 길 (건물로 가는 길) ===
      const vertPath = new Graphics();
      vertPath.rect(220, 60, 60, 80);
      vertPath.fill(0xd7ccc8);
      vertPath.rect(218, 60, 4, 80);
      vertPath.fill(0xa1887f);
      vertPath.rect(278, 60, 4, 80);
      vertPath.fill(0xa1887f);
      app.stage.addChild(vertPath);

      // === 기와집 (탑다운 뷰) ===
      const drawHouse = () => {
        const house = new Graphics();

        // 건물 그림자
        house.rect(138, 68, 230, 75);
        house.fill({ color: 0x000000, alpha: 0.2 });

        // 마당 (건물 앞)
        house.rect(150, 55, 200, 60);
        house.fill(0xe8e0d0);

        // 지붕 (위에서 보면 사각형)
        house.rect(135, 5, 230, 55);
        house.fill(0x4a4a4a);
        // 지붕 기와 패턴
        for (let row = 0; row < 5; row++) {
          for (let col = 0; col < 11; col++) {
            house.rect(140 + col * 20, 8 + row * 10, 18, 8);
            house.fill(row % 2 === 0 ? 0x3a3a3a : 0x5a5a5a);
          }
        }
        // 용마루 (지붕 중앙)
        house.rect(135, 25, 230, 6);
        house.fill(0x2a2a2a);

        // 건물 내부 (마루)
        house.rect(155, 58, 190, 50);
        house.fill(0xdeb887);
        // 마루 무늬
        for (let i = 0; i < 6; i++) {
          house.rect(160 + i * 32, 58, 28, 50);
          house.fill(i % 2 === 0 ? 0xd2a679 : 0xdeb887);
        }

        // 문 (열린 상태로 표현)
        house.rect(225, 105, 50, 10);
        house.fill(0x8b4513);
        // 문지방
        house.rect(220, 108, 60, 4);
        house.fill(0x654321);

        // 방 구분선
        house.rect(200, 58, 3, 50);
        house.fill(0x5d4037);
        house.rect(297, 58, 3, 50);
        house.fill(0x5d4037);

        // 현판
        house.rect(235, 12, 30, 12);
        house.fill(0x8b0000);

        return house;
      };
      app.stage.addChild(drawHouse());

      // === 현판 글씨 ===
      const signText = new Text({
        text: "觀相",
        style: new TextStyle({
          fontSize: 8,
          fill: 0xffd700,
          fontWeight: "bold",
        }),
      });
      signText.x = 239;
      signText.y = 13;
      app.stage.addChild(signText);

      // === 돌담 (건물 주변) ===
      const drawWall = () => {
        const wall = new Graphics();
        // 왼쪽 담
        for (let i = 0; i < 8; i++) {
          wall.rect(120, 10 + i * 15, 12, 12);
          wall.fill(0x9e9e9e);
          wall.rect(122, 10 + i * 15 + 2, 8, 2);
          wall.fill(0x757575);
        }
        // 오른쪽 담
        for (let i = 0; i < 8; i++) {
          wall.rect(368, 10 + i * 15, 12, 12);
          wall.fill(0x9e9e9e);
          wall.rect(370, 10 + i * 15 + 2, 8, 2);
          wall.fill(0x757575);
        }
        return wall;
      };
      app.stage.addChild(drawWall());

      // === 나무들 (탑다운 - 원형) ===
      const drawTree = (x: number, y: number, size: number) => {
        const tree = new Graphics();
        // 나무 그림자
        tree.ellipse(x + 3, y + 3, size, size * 0.7);
        tree.fill({ color: 0x000000, alpha: 0.2 });
        // 나뭇잎 (여러 층)
        tree.circle(x, y, size);
        tree.fill(0x2e7d32);
        tree.circle(x - size * 0.4, y - size * 0.3, size * 0.7);
        tree.fill(0x388e3c);
        tree.circle(x + size * 0.4, y - size * 0.2, size * 0.6);
        tree.fill(0x43a047);
        tree.circle(x, y - size * 0.5, size * 0.5);
        tree.fill(0x4caf50);
        // 나무 기둥 (중앙에 작게)
        tree.circle(x, y, 3);
        tree.fill(0x5d4037);
        return tree;
      };
      // 여러 나무 배치
      app.stage.addChild(drawTree(50, 50, 25));
      app.stage.addChild(drawTree(80, 280, 30));
      app.stage.addChild(drawTree(450, 40, 28));
      app.stage.addChild(drawTree(420, 260, 22));
      app.stage.addChild(drawTree(30, 180, 20));
      app.stage.addChild(drawTree(470, 160, 18));

      // === 작은 꽃/풀 ===
      const drawFlowers = () => {
        const flowers = new Graphics();
        const flowerPositions = [
          { x: 100, y: 100 }, { x: 400, y: 90 },
          { x: 60, y: 250 }, { x: 440, y: 300 },
          { x: 20, y: 120 }, { x: 480, y: 220 },
        ];
        flowerPositions.forEach(pos => {
          // 꽃잎
          flowers.circle(pos.x, pos.y, 4);
          flowers.fill(0xff69b4);
          flowers.circle(pos.x - 3, pos.y - 2, 3);
          flowers.fill(0xffb6c1);
          flowers.circle(pos.x + 3, pos.y - 2, 3);
          flowers.fill(0xffb6c1);
          // 중심
          flowers.circle(pos.x, pos.y, 2);
          flowers.fill(0xffff00);
        });
        return flowers;
      };
      app.stage.addChild(drawFlowers());

      // === 등불 (탑다운) ===
      const drawLantern = (x: number, y: number) => {
        const lantern = new Graphics();
        // 그림자
        lantern.ellipse(x + 2, y + 2, 6, 4);
        lantern.fill({ color: 0x000000, alpha: 0.3 });
        // 등불
        lantern.circle(x, y, 6);
        lantern.fill(0xff6b35);
        lantern.circle(x, y, 4);
        lantern.fill(0xffb347);
        return lantern;
      };
      app.stage.addChild(drawLantern(180, 70));
      app.stage.addChild(drawLantern(320, 70));

      // === 장독대 ===
      const drawPots = () => {
        const pots = new Graphics();
        const potPositions = [
          { x: 395, y: 85 }, { x: 410, y: 90 }, { x: 400, y: 100 },
        ];
        potPositions.forEach(pos => {
          // 그림자
          pots.ellipse(pos.x + 1, pos.y + 1, 7, 5);
          pots.fill({ color: 0x000000, alpha: 0.2 });
          // 항아리
          pots.ellipse(pos.x, pos.y, 7, 5);
          pots.fill(0x8d6e63);
          pots.ellipse(pos.x, pos.y - 2, 5, 3);
          pots.fill(0xa1887f);
        });
        return pots;
      };
      app.stage.addChild(drawPots());

      // === 양반 캐릭터 (탑다운) ===
      const yangban = new Graphics();
      const drawYangban = (x: number, y: number, frame: number, dir: number) => {
        yangban.clear();

        // 그림자
        yangban.ellipse(x, y + 8, 10, 5);
        yangban.fill({ color: 0x000000, alpha: 0.3 });

        // 도포 (몸통 - 위에서 보면 타원)
        yangban.ellipse(x, y, 12, 8);
        yangban.fill(0xf5f5dc);
        // 옷 주름
        yangban.moveTo(x - 4, y - 6);
        yangban.lineTo(x - 4, y + 6);
        yangban.stroke({ width: 1, color: 0xe5e5cc });
        yangban.moveTo(x + 4, y - 6);
        yangban.lineTo(x + 4, y + 6);
        yangban.stroke({ width: 1, color: 0xe5e5cc });

        // 띠
        yangban.rect(x - 10, y - 1, 20, 3);
        yangban.fill(0x4169e1);

        // 갓 (위에서 보면 큰 원)
        yangban.circle(x, y - 2, 11);
        yangban.fill(0x1a1a1a);
        yangban.circle(x, y - 2, 7);
        yangban.fill(0x2a2a2a);
        // 갓 장식
        yangban.circle(x, y - 2, 2);
        yangban.fill(0xffd700);

        // 부채 (방향에 따라)
        if (dir > 0) {
          yangban.moveTo(x + 10, y);
          yangban.lineTo(x + 22, y - 5);
          yangban.lineTo(x + 22, y + 5);
          yangban.closePath();
          yangban.fill(0xfff8dc);
        } else {
          yangban.moveTo(x - 10, y);
          yangban.lineTo(x - 22, y - 5);
          yangban.lineTo(x - 22, y + 5);
          yangban.closePath();
          yangban.fill(0xfff8dc);
        }

        // 걷는 효과 (약간의 좌우 흔들림)
        const wobble = Math.sin(frame * 0.2) * 0.5;
        yangban.rotation = wobble * 0.05;
      };
      drawYangban(yangbanX, yangbanY, 0, 1);
      app.stage.addChild(yangban);

      // === 방문객 (탑다운 - 한복 여성) ===
      const visitor = new Graphics();
      const drawVisitor = (x: number, y: number, frame: number, dir: number) => {
        visitor.clear();

        // 그림자
        visitor.ellipse(x, y + 6, 8, 4);
        visitor.fill({ color: 0x000000, alpha: 0.3 });

        // 치마 (위에서 보면 큰 원)
        visitor.circle(x, y + 2, 12);
        visitor.fill(0xdc143c);
        // 치마 주름
        visitor.moveTo(x, y - 8);
        visitor.lineTo(x - 3, y + 12);
        visitor.stroke({ width: 1, color: 0xb71c1c });
        visitor.moveTo(x, y - 8);
        visitor.lineTo(x + 3, y + 12);
        visitor.stroke({ width: 1, color: 0xb71c1c });

        // 저고리
        visitor.ellipse(x, y - 4, 8, 5);
        visitor.fill(0xffeb3b);
        // 색동
        visitor.rect(x - 9, y - 6, 4, 8);
        visitor.fill(0xff5722);
        visitor.rect(x + 5, y - 6, 4, 8);
        visitor.fill(0x4caf50);

        // 머리 (위에서 보면 원형 + 댕기)
        visitor.circle(x, y - 6, 6);
        visitor.fill(0x2a1810);
        // 가르마
        visitor.moveTo(x, y - 10);
        visitor.lineTo(x, y - 2);
        visitor.stroke({ width: 1, color: 0x1a1008 });
        // 머리 장식
        visitor.circle(x, y - 10, 3);
        visitor.fill(0xff69b4);
        // 댕기
        visitor.rect(x - 1, y, 2, 10);
        visitor.fill(0xff0000);
      };
      drawVisitor(visitorX, visitorY, 0, -1);
      app.stage.addChild(visitor);

      // === 타이틀 ===
      const titleBg = new Graphics();
      titleBg.roundRect(150, 250, 200, 55, 8);
      titleBg.fill({ color: 0x000000, alpha: 0.6 });
      app.stage.addChild(titleBg);

      const titleStyle = new TextStyle({
        fontFamily: "KimjungchulMyungjo-Bold, serif",
        fontSize: 24,
        fill: 0xffd700,
        fontWeight: "bold",
        dropShadow: {
          color: 0x000000,
          blur: 3,
          distance: 2,
        },
      });
      const title = new Text({ text: "양반가", style: titleStyle });
      title.x = 210;
      title.y = 255;
      app.stage.addChild(title);

      const subtitleStyle = new TextStyle({
        fontFamily: "sans-serif",
        fontSize: 10,
        fill: 0xffffff,
      });
      const subtitle = new Text({
        text: "AI 관상으로 당신의 운명을 봐드리오",
        style: subtitleStyle,
      });
      subtitle.x = 175;
      subtitle.y = 283;
      app.stage.addChild(subtitle);

      // === 애니메이션 ===
      app.ticker.add(() => {
        frameCount++;

        // 양반 이동 (길 위에서 좌우)
        yangbanX += 0.4 * yangbanDirection;
        if (yangbanX > 320) yangbanDirection = -1;
        else if (yangbanX < 180) yangbanDirection = 1;
        drawYangban(yangbanX, yangbanY, frameCount, yangbanDirection);

        // 방문객 이동 (대각선으로)
        visitorX += 0.25 * visitorDirection;
        visitorY += 0.1 * visitorDirection;
        if (visitorX < 250) {
          visitorDirection = 1;
          visitorY = 220;
        } else if (visitorX > 380) {
          visitorDirection = -1;
        }
        drawVisitor(visitorX, visitorY, frameCount, visitorDirection);
      });
    };

    init();

    return () => {
      app.destroy(true, { children: true });
    };
  }, [isClient]);

  if (!isClient) {
    return (
      <div
        style={{
          width: "100%",
          maxWidth: 500,
          height: 320,
          background: "#7cb342",
        }}
      />
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        maxWidth: 500,
        display: "flex",
        justifyContent: "center",
        imageRendering: "pixelated",
      }}
    />
  );
}
