# 设置标题
pygame.display.set_caption("恐龙快跑")

# 定义颜色
white = (255, 255, 255)
green = (0, 255, 0)
red = (255, 0, 0)

# 设置时钟
clock = pygame.time.Clock()

# 屏幕大小
screen_width = 800
screen_height = 600
screen = pygame.display.set_mode((screen_width, screen_height))

# 加载恐龙图片
dino_img = pygame.image.load('dino.jpg')  # 确保有名为dino.jpg的文件
dino_img = pygame.transform.scale(dino_img, (50, 50))
dino_rect = dino_img.get_rect()
dino_rect.x = 50
dino_rect.y = screen_height - 70

# 障碍物设置
obstacle_img = pygame.image.load('obstacle.jpg')  # 确保有名为obstacle.jpg的文件
obstacle_img = pygame.transform.scale(obstacle_img, (50, 50))
obstacle_rect = obstacle_img.get_rect()
obstacle_rect.x = screen_width
obstacle_rect.y = screen_height - 100

# 得分
score = 0

# 游戏主循环
running = True
while running:
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False

    # 检测按键
    keys = pygame.key.get_pressed()
    if keys[pygame.K_SPACE]:  # 跳跃逻辑
        dino_rect.y -= 20  # 向上移动

    # 恐龙下落逻辑（模拟重力）
    dino_rect.y += 2

    # 天花板限制
    if dino_rect.y <= 0:
        dino_rect.y = 0  # 防止恐龙超出顶部

    # 地板限制
    if dino_rect.y >= screen_height - dino_rect.height:
        dino_rect.y = screen_height - dino_rect.height  # 防止恐龙掉出底部

    # 障碍物移动
    obstacle_rect.x -= 5
    if obstacle_rect.x < 0:
        obstacle_rect.x = screen_width
        obstacle_rect.y = random.randint(50, screen_height - 100)
        score += 1

    # 检测碰撞
    if dino_rect.colliderect(obstacle_rect):
        running = False

    # 填充背景
    screen.fill(white)

    # 绘制恐龙和障碍物
    screen.blit(dino_img, dino_rect)
    screen.blit(obstacle_img, obstacle_rect)

    # 显示得分
    font = pygame.font.Font(None, 36)
    text = font.render(f"Score: {score}", True, green)
    screen.blit(text, (10, 10))

    # 更新屏幕
    pygame.display.flip()

    # 控制游戏速度
    clock.tick(30)

pygame.quit()
