"""
以下代码由 柴桑 编写
这个程序能够加载并播放背景音乐，
同时实现一个简单的恐龙快跑游戏，
玩家可以控制恐龙跳跃和左右移动以避开障碍物
"""


from PIL import Image  # 导入Pillow库中的Image模块，用于图像处理
import pygame  # 导入pygame库，用于游戏开发
import random  # 导入random库，用于生成随机数

# 图片文件路径列表
image_paths = [
    'images/HG2.0.png',
    'images/中式柱子1.jpg',
    'images/安国寺-removebg-preview.png',
    'images/中式柱子2.jpg',
    'images/HG3.0-removebg-preview.png',
    'images/中式柱子3.jpg',
    'images/遗爱湖建筑群-removebg-preview.png',
    'images/中式柱子4.jpg',
    'images/长江大桥-removebg-preview.png',
    'images/中式柱子5.jpg',
    'images/陈潭秋故居-removebg-preview.png',
    'images/中式柱子6.jpg',
    'images/壁纸-removebg-preview.png',
    'images/中式柱子7.jpg',
    'images/黄冈市博物馆-removebg-preview.png',
    'images/中式柱子8.jpg',
    'images/黄州师范学院-removebg-preview.png',
    'images/中式柱子9.jpg',
    'images/黄州文庙-removebg-preview.png',
    'images/中式柱子10.jpg',
    'images/栖霞楼-removebg-preview.png',
    'images/中式柱子11.jpg',
    'images/青云塔-removebg-preview.png',
    'images/中式柱子12.jpg',
    'images/柴小桑的背影.jpg',
    'images/中式柱子13.jpg'
]

# 游戏屏幕高度
screen_height = 800

# 打开所有图片并计算总宽度
images = [Image.open(path) for path in image_paths]  # 打开所有图片文件
total_width = sum(int(img.width * (screen_height / img.height)) for img in images)  # 计算所有图片的总宽度，保持宽高比

# 创建一个新的空白图像，高度为屏幕高度
background = Image.new('RGBA', (total_width, screen_height))  # 创建一个新图像，大小为总宽度和屏幕高度

# 将每张图片粘贴到背景上
current_x = 0  # 初始化当前x坐标
for image in images:
    new_width = int(image.width * (screen_height / image.height))  # 计算新的宽度，保持宽高比
    resized_image = image.resize((new_width, screen_height), Image.LANCZOS)  # 调整图片大小
    background.paste(resized_image, (current_x, 0))  # 将调整后的图片粘贴到背景上
    current_x += new_width  # 更新当前x坐标

# 保存合成的背景图像
background.save('images/combined_buildings_aligned.png')  # 保存合成后的图像

# 初始化 Pygame
pygame.init()
# 初始化音频混合器
pygame.mixer.init()

# 加载并播放背景音乐
try:
    pygame.mixer.music.load("望春风 - 陈佳.mp3")  # 加载背景音乐
    pygame.mixer.music.set_volume(0.5)  # 设置音量（0.0到1.0之间）
    pygame.mixer.music.play(-1)  # -1表示循环播放
except pygame.error as e:
    print(f"无法加载或播放背景音乐: {e}")

# 屏幕大小
WIDTH, HEIGHT = 1600, 800
screen = pygame.display.set_mode((WIDTH, HEIGHT))  # 设置屏幕大小
pygame.display.set_caption("恐龙快跑（黄州府）")  # 设置窗口标题

# 颜色定义
BLUE = (135, 206, 250)  # 天空蓝
BLACK = (0, 0, 0)  # 黑色

# 时钟和字体
clock = pygame.time.Clock()  # 创建时钟对象，用于控制帧率
font = pygame.font.Font(None, 72)  # 创建字体对象，用于显示文本

# 恐龙类
class Dinosaur(pygame.sprite.Sprite):
    def __init__(self):
        super().__init__()
        self.image = pygame.image.load('images/小恐龙-removebg-preview.png')
        self.image = pygame.transform.scale(self.image, (160, 240))  # 增加到原来的两倍大
        self.rect = self.image.get_rect()
        self.rect.x = (WIDTH - self.image.get_width()) // 2  # 水平居中
        self.rect.y = HEIGHT - self.image.get_height()  # 让恐龙的底部落在地面上
        self.is_jumping = False
        self.jump_speed = 50  # 增加跳跃速度
        self.gravity = 2.4  # 略微增加重力
        self.velocity = 0
        self.move_speed = 8  # 新增：左右移动速度
        self.mask = pygame.mask.from_surface(self.image)  # 创建mask

    def jump(self):
        if not self.is_jumping:
            self.is_jumping = True
            self.velocity = -self.jump_speed

    def update(self):
        keys = pygame.key.get_pressed()  # 获取按键状态
        if keys[pygame.K_LEFT]:  # 如果按下左键
            self.rect.x -= self.move_speed  # 向左移动
        if keys[pygame.K_RIGHT]:  # 如果按下右键
            self.rect.x += self.move_speed  # 向右移动

        # 防止小恐龙移出屏幕
        if self.rect.right > WIDTH:
            self.rect.right = WIDTH
        if self.rect.left < 0:
            self.rect.left = 0

        if self.is_jumping:
            self.rect.y += self.velocity
            self.velocity += self.gravity
            if self.rect.y >= HEIGHT - self.image.get_height():
                self.rect.y = HEIGHT - self.image.get_height()
                self.is_jumping = False
                self.velocity = 0

    def draw(self, screen):
        screen.blit(self.image, self.rect)  # 绘制恐龙图片

# 障碍物类
class Obstacle(pygame.sprite.Sprite):
    def __init__(self, x, y, speed, image_path):
        super().__init__()
        self.image = pygame.image.load(image_path)  # 加载障碍物图片
        self.image = pygame.transform.scale(self.image, (30, 50))  # 缩小图片到30x50像素
        self.rect = self.image.get_rect()  # 获取图片的矩形区域
        self.rect.x = x  # 设置初始x坐标
        self.rect.y = y  # 设置初始y坐标
        self.speed = speed  # 设置移动速度
        self.mask = pygame.mask.from_surface(self.image)  # 创建mask

    def update(self):
        self.rect.x -= self.speed  # 根据速度更新x坐标，向左移动

    def draw(self, screen):
        screen.blit(self.image, self.rect)  # 绘制障碍物图片

# 建筑物类
class Building:
    def __init__(self, image_path):
        self.image = pygame.image.load(image_path)  # 加载建筑物图片
        self.rect1 = self.image.get_rect()  # 获取图片的矩形区域
        self.rect2 = self.image.get_rect()  # 创建第二个矩形区域用于循环
        self.width = self.image.get_width()  # 获取图片宽度
        self.height = self.image.get_height()  # 获取图片高度
        self.speed = 2  # 设置移动速度

    def update(self):
        self.rect1.x -= self.speed  # 根据速度更新x坐标，向左移动
        self.rect2.x -= self.speed  # 第二个背景也同步移动

        # 如果第一个背景图完全离开屏幕，则重置位置
        if self.rect1.right < 0:
            self.rect1.x = self.rect2.right

        # 如果第二个背景图完全离开屏幕，则重置位置
        if self.rect2.right < 0:
            self.rect2.x = self.rect1.right

    def draw(self, screen):
        screen.blit(self.image, self.rect1)  # 绘制第一个背景图片
        screen.blit(self.image, self.rect2)  # 绘制第二个背景图片

# 主游戏函数
def main():
    run = True  # 游戏运行标志
    dinosaur = Dinosaur()  # 创建恐龙对象
    obstacles = []  # 障碍物列表
    building_image_path = 'images/combined_buildings_aligned.png'  # 建筑物图片路径
    building = Building(building_image_path)  # 创建建筑物对象
    spawn_timer = 0  # 计时器，用于控制障碍物的生成频率
    score = 0  # 分数
    min_obstacle_distance = 300  # 最小障碍物距离
    obstacle_image_path = 'images/刺猬-removebg-preview.png'  # 障碍物图片路径
    last_obstacle_speed = random.randint(5, 10)  # 最后一个障碍物的速度

    while run:
        screen.fill(BLUE)  # 填充屏幕背景色
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                run = False  # 如果点击关闭按钮，则退出游戏循环
            if event.type == pygame.KEYDOWN:
                if event.key == pygame.K_SPACE:
                    dinosaur.jump()  # 如果按下空格键，则让恐龙跳跃
            if event.type == pygame.KEYUP:
                if event.key == pygame.K_SPACE:
                    dinosaur.is_space_pressed = False  # 如果松开空格键，则标记为未按下

        building.update()  # 更新建筑物位置
        building.draw(screen)  # 绘制建筑物
        dinosaur.update()  # 更新恐龙位置
        dinosaur.draw(screen)  # 绘制恐龙

        if spawn_timer <= 0:
            x = WIDTH  # 如果计时器到期，则在屏幕右侧生成新的障碍物
            if obstacles:
                last_obstacle = obstacles[-1]
                while x - last_obstacle.rect.right < min_obstacle_distance:
                    x = random.randint(WIDTH, WIDTH + 1500)  # 确保障碍物之间的距离足够大
            new_speed = random.randint(last_obstacle_speed, min(last_obstacle_speed, 12))  # 随机生成障碍物速度
            obstacle = Obstacle(x, HEIGHT - 90, new_speed, obstacle_image_path)  # 创建新的障碍物对象
            obstacles.append(obstacle)  # 将障碍物添加到列表中
            spawn_timer = random.randint(50, 100)  # 重置计时器，随机生成下一个障碍物的生成时间
        spawn_timer -= 1  # 每次循环减少计时器值

        for obstacle in obstacles[:]:
            obstacle.update()  # 更新障碍物位置
            obstacle.draw(screen)  # 绘制障碍物
            if obstacle.rect.right < 0:
                obstacles.remove(obstacle)  # 如果障碍物移出屏幕，则移除它
                score += 1  # 增加分数
            # 使用mask进行碰撞检测
            if pygame.sprite.collide_mask(dinosaur, obstacle) is not None:
                run = False  # 如果恐龙与障碍物碰撞，则结束游戏循环

        score_text = font.render(f"Run,run,run: {score}", True, BLACK)  # 渲染分数文本
        screen.blit(score_text, (20, 20))  # 绘制分数文本到屏幕上
        pygame.display.flip()  # 刷新屏幕显示内容
        clock.tick(60)  # 控制游戏帧率为60fps

    # 游戏结束时停止音乐
    pygame.mixer.music.stop()
    
    game_over_text = font.render(f"Game Over! Final Score: {score}", True, BLACK)  # 渲染游戏结束文本
    screen.blit(game_over_text, (WIDTH // 2 - game_over_text.get_width() // 2, HEIGHT // 2))  # 居中绘制游戏结束文本到屏幕上
    pygame.display.flip()  # 刷新屏幕显示内容
    pygame.time.wait(2000)  # 等待2秒后退出游戏循环
    pygame.quit()  # 退出Pygame库

if __name__ == "__main__":
    main()  # 调用主游戏函数开始游戏循环

