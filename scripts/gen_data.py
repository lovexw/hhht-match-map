#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
青城有你 · 呼和浩特同城相亲地图 —— 模拟数据生成器
输出: assets/js/data.js  (window.HHHT_DATA)
坐标: 人物位置为 WGS84 真值；行政区边界 GeoJSON 为 GCJ-02（DataV），
前端用 wgs2gcj 转换后与高德底图对齐。
"""
import json, math, random, datetime, os

random.seed(20261027)
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ---------- 坐标转换 WGS84 -> GCJ02 ----------
def out_of_china(lng, lat):
    return not (73.66 < lng < 135.05 and 3.86 < lat < 53.55)

def _tl(x, y):
    r = 300 + x + 2*y + 0.1*x*x + 0.1*x*y + 0.1*math.sqrt(abs(x))
    r += (20*math.sin(6*x*math.pi) + 20*math.sin(2*x*math.pi))*2/3
    r += (20*math.sin(x*math.pi) + 40*math.sin(x/3*math.pi))*2/3
    r += (150*math.sin(x/12*math.pi) + 300*math.sin(x/30*math.pi))*2/3
    return r

def _tlat(x, y):
    r = -100 + 2*x + 3*y + 0.2*y*y + 0.1*x*y + 0.2*math.sqrt(abs(x))
    r += (20*math.sin(6*x*math.pi) + 20*math.sin(2*x*math.pi))*2/3
    r += (20*math.sin(y*math.pi) + 40*math.sin(y/3*math.pi))*2/3
    r += (160*math.sin(y/12*math.pi) + 320*math.sin(y*math.pi/30))*2/3
    return r

def wgs2gcj(lng, lat):
    if out_of_china(lng, lat):
        return lng, lat
    a, ee = 6378245.0, 0.00669342162296594323
    dlat = _tlat(lng-105.0, lat-35.0)
    dlng = _tl(lng-105.0, lat-35.0)
    rad = lat/180.0*math.pi
    magic = 1 - ee*math.sin(rad)**2
    sm = math.sqrt(magic)
    dlat = (dlat*180.0)/((a*(1-ee))/(magic*sm)*math.pi)
    dlng = (dlng*180.0)/(a/sm*math.cos(rad)*math.pi)
    return lng+dlng, lat+dlat

# ---------- 读取四区边界 ----------
geo = json.load(open(os.path.join(ROOT, 'assets/data/hhht_full.json')))
DISTRICTS = {
    150102: {'name': '新城区', 'color': '#F59E0B', 'slogan': '城北新城 · 政务与高校汇聚'},
    150103: {'name': '回民区', 'color': '#10B981', 'slogan': '老城烟火 · 清真风情与生活腹地'},
    150104: {'name': '玉泉区', 'color': '#F43F5E', 'slogan': '召河文化 · 大召老街古韵悠长'},
    150105: {'name': '赛罕区', 'color': '#3B82F6', 'slogan': '东南新城 · 大学与产业增长极'},
}
feats = {f['properties']['adcode']: f for f in geo['features']}

def rings_of(feat):
    g = feat['geometry']
    if g['type'] == 'Polygon':
        return g['coordinates']
    return [r for poly in g['coordinates'] for r in poly]

def pip(x, y, rings):
    inside = False
    for ring in rings:
        j = len(ring)-1
        for i in range(len(ring)):
            xi, yi = ring[i][0], ring[i][1]
            xj, yj = ring[j][0], ring[j][1]
            if (yi > y) != (yj > y) and x < (xj-xi)*(y-yi)/(yj-yi)+xi:
                inside = not inside
            j = i
    return inside

# 城区采样框 (WGS84)
BOXES = {
    150102: (111.700, 111.800, 40.818, 40.900),
    150103: (111.630, 111.720, 40.800, 40.860),
    150104: (111.625, 111.725, 40.750, 40.815),
    150105: (111.720, 111.830, 40.775, 40.850),
}

# 附近地标 (WGS84 近似)
PLACES = {
    150102: ['成吉思汗大街', '呼和浩特火车站', '鼓楼立交桥', '新华大街', '内蒙古博物院',
             '八一市场', '北垣街', '苏虎街', '阿尔泰游乐园', '一家村', '光华街', '维多利国际广场'],
    150103: ['清真大寺', '中山西路', '通道街', '新华西街', '钢铁路',
             '内蒙古医科大学附属医院', '乌兰夫纪念馆', '工人西村', '西龙王庙', '县府街', '金海工业园区', '巴彦淖尔北路'],
    150104: ['大召寺', '塞上老街', '小召', '五塔寺', '南茶坊',
             '观音寺', '昭君路', '南湖湿地公园', '石羊桥', '万锦商圈', '五里营', '西菜园'],
    150105: ['内蒙古大学', '内蒙古师范大学', '内蒙古农业大学', '大学东路', '昭乌达路',
             '赛罕万达广场', '金桥开发区', '如意开发区', '敕勒川公园', '保全庄', '中海蓝湾', '东河沿岸'],
}
# 地标近似坐标
PLACE_LNG = {
    150102: dict(zip(PLACES[150102], [(111.758,40.868),(111.751,40.833),(111.756,40.826),(111.752,40.820),(111.737,40.843),(111.735,40.855),(111.760,40.844),(111.758,40.830),(111.785,40.875),(111.790,40.870),(111.770,40.838),(111.748,40.818)])),
    150103: dict(zip(PLACES[150103], [(111.728,40.814),(111.735,40.810),(111.728,40.816),(111.700,40.805),(111.680,40.817),(111.728,40.812),(111.735,40.817),(111.670,40.820),(111.660,40.808),(111.720,40.806),(111.620,40.810),(111.690,40.820)])),
    150104: dict(zip(PLACES[150104], [(111.702,40.803),(111.695,40.800),(111.715,40.808),(111.735,40.801),(111.725,40.795),(111.725,40.802),(111.690,40.780),(111.690,40.755),(111.730,40.798),(111.730,40.770),(111.720,40.785),(111.670,40.790)])),
    150105: dict(zip(PLACES[150105], [(111.742,40.815),(111.730,40.810),(111.710,40.800),(111.720,40.815),(111.730,40.812),(111.730,40.808),(111.760,40.775),(111.760,40.835),(111.790,40.805),(111.790,40.785),(111.740,40.790),(111.770,40.830)])),
}

def sample_point(code):
    x0, x1, y0, y1 = BOXES[code]
    rings = rings_of(feats[code])
    for _ in range(3000):
        lng = random.uniform(x0, x1)
        lat = random.uniform(y0, y1)
        gx, gy = wgs2gcj(lng, lat)
        if pip(gx, gy, rings):
            return round(lng, 6), round(lat, 6)
    raise RuntimeError('point sample failed ' + str(code))

def nearest_place(code, lng, lat):
    best, bd = None, 1e9
    for name, (px, py) in PLACE_LNG[code].items():
        d = (px-lng)**2 + (py-lat)**2
        if d < bd:
            bd, best = d, name
    return best

# ---------- 词库 ----------
F_NAMES = ['晚晚','小满','知夏','阿瓷','糖糕','苏念','夏野','沈清','Coco','糯米','桃桃',
           '风信子','橘子','阿禾','青禾','栗子','远山','安然','花卷','书瑶','小棠','咕噜',
           '阿旅','雪团','微醺','画布','篝火','南笙','初见','小夜曲']
M_NAMES = ['景行','阿泽','墨白','远舟','山风','雪落','阿澈','书山','老陈','六弦','向阳',
           '破风','渔歌','晨风','知行','半盏','旅人','机车','篝火','阿纪','三不沾','阿宝',
           '快门','夜航','背包','430','后仰','微醺','牧马','教书先生']

SCHOOLS = ['内蒙古大学','内蒙古师范大学','内蒙古工业大学','内蒙古农业大学','内蒙古财经大学',
           '内蒙古医科大学','内蒙古艺术学院','呼和浩特民族学院','区外一本院校','区外211院校',
           '专科院校','海外院校']
HOMETOWN = ['呼和浩特本地','赤峰','通辽','包头','鄂尔多斯','乌兰察布','巴彦淖尔','锡林郭勒',
            '兴安盟','呼伦贝尔','乌海','阿拉善','山西','河北','陕西','甘肃','黑龙江']

F_JOBS = [
    ('小学语文教师','教育','事业单位',13),('初中英语教师','教育','事业单位',14),('幼儿园教师','教育','事业单位',10),
    ('高校行政老师','教育','事业单位',15),('儿科护士','医疗','公立医院',14),('内科医生','医疗','公立医院',28),
    ('药剂师','医疗','连锁药房',11),('银行客户经理','金融','国有银行',18),('财务会计','财务','民营企业',12),
    ('审计专员','财务','会计师事务所',15),('室内设计师','设计','设计公司',18),('UI设计师','设计','互联网公司',16),
    ('平面设计师','设计','广告公司',12),('新媒体运营','互联网','文化传媒',11),('自媒体博主','互联网','自由职业',17),
    ('街道办公务员','政府','公务员',13),('博物院讲解员','文旅','事业单位',10),('执业律师','法律','律师事务所',25),
    ('心理咨询师','医疗','咨询机构',16),('空乘乘务长','航空','航空公司',19),('高铁乘务员','铁路','铁路系统',12),
    ('烘焙店主','餐饮','个体经营',20),('花艺工作室主理人','零售','个体经营',16),('瑜伽教练','体育','健身机构',12),
    ('健身教练','体育','健身机构',14),('舞蹈老师','教育','培训机构',11),('钢琴老师','教育','艺术培训',13),
    ('美术老师','教育','培训机构',10),('人像摄影师','传媒','摄影工作室',15),('英语翻译','外贸','外贸公司',14),
    ('人力资源专员','行政','民营企业',11),('医美顾问','医疗','医美机构',16),('前端开发工程师','互联网','互联网公司',20),
    ('建筑工程师','建筑','设计院',18),('电商运营','互联网','电商公司',12),('置业顾问','地产','房地产',14),
    ('咖啡师','餐饮','连锁咖啡',9),('伊利集团行政','快消','国企',13),('移动公司职员','通信','国企',12),
]
M_JOBS = [
    ('后端开发工程师','互联网','互联网公司',24),('算法工程师','互联网','互联网公司',30),('前端开发工程师','互联网','互联网公司',20),
    ('建筑工程师','建筑','设计院',18),('电气工程师','能源','电力系统',19),('机械工程师','制造','装备制造',15),
    ('银行信息科技部','金融','国有银行',20),('伊利生产管理','快消','国企',17),('蒙牛渠道经理','快消','国企',18),
    ('税务局公务员','政府','公务员',14),('公安系统民警','政府','公务员',15),('住建系统公务员','政府','公务员',13),
    ('外科医生','医疗','公立医院',30),('执业律师','法律','律师事务所',26),('高校辅导员','教育','事业单位',14),
    ('高中数学老师','教育','事业单位',13),('销售经理','销售','民营企业',18),('汽车销售顾问','汽车','4S店',15),
    ('连锁餐饮老板','餐饮','个体经营',30),('建材生意','批发零售','个体经营',35),('物流调度主管','物流','物流公司',14),
    ('机场地勤','航空','机场集团',12),('供电公司运维','能源','国企',16),('铁路机务段职工','铁路','铁路系统',13),
    ('景观设计师','设计','设计公司',16),('独立摄影师','传媒','自由职业',17),('健身教练','体育','健身机构',12),
    ('交警支队辅警','政府','合同制',8),('消防救援队员','政府','事业单位',12),('装修公司项目经理','建筑','民营企业',18),
    ('化工工程师','制造','化工企业',15),('会计事务所审计','财务','会计师事务所',16),('自媒体剧情号导演','传媒','文化传媒',19),
    ('口腔医生','医疗','民营医院',24),('保险公司理赔','金融','保险公司',12),('新能源车企工程师','制造','上市公司',22),
]
EDU_RANK = ['高中','中专','大专','本科','硕士','博士']
EDU_POOL_F = ['大专','本科','本科','本科','硕士','本科','大专','硕士','本科']
EDU_POOL_M = ['大专','本科','本科','本科','硕士','本科','大专','本科','硕士']

TAGS_ALL = ['旅行','看电影','美食探店','健身','阅读','摄影','音乐','烘焙','爬山','骑行','露营','咖啡','养猫',
            '养狗','羽毛球','游泳','滑雪','跑步','画画','做饭','喝茶','小酌','综艺','动漫','游戏','自驾',
            '书法','民谣','话剧','看展','手工','花艺','徒步','瑜伽','马拉松','钓鱼','机车','汉服','历史',
            '篮球','台球','钢琴','舞蹈','旅行vlog','居家','宠物','精酿','桌游','收纳']

HOUSE_F = ['已购房(有贷款)','已购房(全款)','和家人同住','租房','租房','老家有房']
HOUSE_M = ['已购房(有贷款)','已购房(全款)','已购房(全款)','租房','租房','老家有房','单位宿舍']
CAR_F = ['未购车','已购车','已购车','未购车','摇号中']
CAR_M = ['已购车','已购车','已购车','未购车','已购车','未购车']

ZODIAC = ['摩羯座','水瓶座','双鱼座','白羊座','金牛座','双子座','巨蟹座','狮子座','处女座','天秤座','天蝎座','射手座']

def pick_bday(age):
    today = datetime.date(2026, 10, 27)
    year = today.year - age
    m = random.randint(1, 12)
    d = random.randint(1, 28)
    return datetime.date(year, m, d)

def zodiac_of(m, d):
    cuts = [20,19,21,20,21,22,23,23,23,24,23,22]
    return ZODIAC[(m if d >= cuts[m-1] else m-1) % 12]

def daterange(start, end):
    t = start + datetime.timedelta(seconds=random.randint(0, int((end-start).total_seconds())))
    return t.strftime('%Y-%m-%d')

# ---------- 文本模板 ----------
F_OPEN = [
    '呼和浩特本地姑娘，{y}年生人，从小在青城长大，对这座城市的春夏秋冬都有感情。',
    '来自{ht}的内蒙姑娘，在呼市工作生活{yn}年了，已经把这里当成第二故乡。',
    '土生土长的呼市人，生活圈子简单，朋友都说我是那种相处起来很舒服的人。',
    '在呼市定居{yn}年，工作稳定，自己把日子过得还不错，想认真找个能走下去的人。',
]
M_OPEN = [
    '呼和浩特本地男生，{y}年生人，性格稳重，做事有计划，属于话不多但靠谱的类型。',
    '来自{ht}，大学毕业后留在呼市，房车都在这边安顿好了，就差一个一起过日子的人。',
    '新呼和浩特人，在呼市打拼{yn}年，喜欢这座城市的节奏，也打算长期在这里发展。',
    '土生土长的内蒙汉子，性格直爽，不玩套路，感情里最看重真诚和担当。',
]
F_PERS = [
    '性格慢热，刚认识话不多，熟了之后会发现我挺有趣的。',
    '性格开朗，爱笑，情绪稳定，很少内耗。',
    '偏内向，喜欢安静的生活，但是熟悉的人面前话很多。',
    '独立有主见，经济和精神都不依赖别人，也愿意为感情认真投入。',
    '性格温和，脾气好，家庭观念重，觉得两个人在一起舒服比什么都重要。',
    '典型的i人，真诚直接，不喜欢绕弯子和冷暴力。',
]
M_PERS = [
    '性格沉稳，情绪稳定，不发脾气，有问题习惯沟通解决。',
    '性格开朗，自带幽默感，朋友评价是个靠谱的热心肠。',
    '偏理性，做事有规划，生活里不烟少酒，圈子干净。',
    '踏实顾家，工作之外基本不出去应酬，喜欢在家研究做饭。',
    '性格直爽，说到做到，讨厌画大饼和冷暴力。',
    '温和内敛，熟了之后很有梗，感情里注重仪式感。',
]
def hobby_sent(tags, gender):
    h = tags[:3]
    if gender == 'F':
        return f'平时喜欢{h[0]}、{h[1]}和{h[2]}，周末会安排得比较充实，也期待遇到能一起玩的人。'
    return f'业余时间主要花在{h[0]}、{h[1]}和{h[2]}上，生活健康，没有不良嗜好。'

F_EXPECT = [
    '希望你年龄相当、情绪稳定，有结婚的打算，两个人先做朋友，处得舒服再往下走。',
    '希望对方真诚、有责任感，在呼和浩特长期发展，能接受平淡日子里的小确幸。',
    '期待一段以结婚为目的的感情，希望你人品好、有担当，沟通起来不费劲。',
    '希望对方尊重女性、孝顺父母，有自己的爱好，也愿意陪我一起体验新鲜事。',
]
M_EXPECT = [
    '希望对方性格好、三观正，愿意在呼和浩特定居，两个人一起经营小日子。',
    '期待遇见真诚善良的姑娘，年龄学历不重要，聊得来、彼此舒服最重要。',
    '希望她性格温和、热爱生活，婚姻是两个家庭的事，也希望两边父母都能认可。',
    '希望对方情绪稳定、认真对待感情，奔着结婚去，不玩暧昧。',
]
REQ_NOTES_F = [
    '希望对方在呼和浩特定居，不接受异地',
    '希望对方有稳定工作和住房，婚后一到两年内要孩子',
    '希望对方不吸烟、少喝酒，能接受我养猫',
    '希望对方性格开朗，婚后愿意分担家务',
    '希望对方真诚专一，不接受冷暴力',
    '希望对方有结婚规划，一年内能订婚',
    '离异带娃也可以，关键看人品和对孩子的态度',
    '希望对方孝顺、有责任心，喜欢简单的生活',
    '希望对方身高175以上，学历不低于本科',
]
REQ_NOTES_M = [
    '希望对方在呼和浩特工作生活，不接受异地',
    '希望对方性格温柔，婚后愿意要孩子',
    '希望对方真诚过日子，物质条件可以一起奋斗',
    '希望对方不泡吧、不抽烟，家庭关系简单',
    '希望对方年龄差不超过三岁，相处舒服最重要',
    '希望对方喜欢小孩，尊重父母',
    '希望对方有自己的事业或爱好，不依附不内耗',
    '离异无孩可以接受，希望对方真诚',
]

def make_intro(g, tags, job, hometown, age, y, yn):
    if g == 'F':
        s = random.choice(F_OPEN).format(y=y, ht=hometown, yn=yn)
        s += f'目前在{job}，工作稳定，作息规律。'
        s += random.choice(F_PERS)
        s += hobby_sent(tags, 'F')
        s += random.choice(F_EXPECT)
    else:
        s = random.choice(M_OPEN).format(y=y, ht=hometown, yn=yn)
        s += f'目前从事{job}，收入稳定，有长期规划。'
        s += random.choice(M_PERS)
        s += hobby_sent(tags, 'M')
        s += random.choice(M_EXPECT)
    return s

# ---------- 生成 ----------
def make(g, idx, code):
    age = random.choices(range(23, 35), weights=[3,4,5,6,7,7,7,6,5,4,3,2])[0]
    bday = pick_bday(age)
    edu = random.choice(EDU_POOL_F if g == 'F' else EDU_POOL_M)
    jobs = F_JOBS if g == 'F' else M_JOBS
    job, ind, etype, base = random.choice(jobs)
    # 学历与年龄修正收入
    income = base + random.randint(-2, 6) + (1 if edu == '硕士' else 0) + (2 if edu == '博士' else 0)
    if age > 30:
        income += random.randint(2, 8)
    income = max(7, income)
    height = (random.randint(158, 172) if g == 'F' else random.randint(170, 187))
    weight = (round(height*0.30 + random.randint(-6, 5)) if g == 'F' else round(height*0.42 + random.randint(-5, 8)))
    hometown = random.choice(HOMETOWN)
    yn = random.randint(2, 9)
    tags = random.sample(TAGS_ALL, random.randint(4, 6))
    marital = '未婚'
    children = '无'
    if age >= 28 and random.random() < (0.08 if g == 'F' else 0.10):
        marital = random.choice(['离异无孩', '离异无孩', '离异带娃'])
        children = '有一个孩子(随对方)' if marital == '离异带娃' else '无'
    eth = random.choices(['汉族', '蒙古族', '回族'], weights=[80, 15, 5])[0]
    if code == 150103 and eth == '汉族' and random.random() < 0.25:
        eth = '回族'
    house = random.choice(HOUSE_F if g == 'F' else HOUSE_M)
    car = random.choice(CAR_F if g == 'F' else CAR_M)
    lng, lat = sample_point(code)
    place = nearest_place(code, lng, lat)
    # 择偶要求
    if g == 'F':
        amin, amax = max(23, age - 2), age + random.randint(3, 8)
        hmin = random.choice([170, 172, 174, 175, 178])
        edu_min = random.choice(['大专', '大专', '本科'])
        note = random.choice(REQ_NOTES_F)
    else:
        amin, amax = max(21, age - random.randint(3, 6)), age + random.randint(0, 3)
        hmin = random.choice([158, 160, 162, 165, 168])
        edu_min = random.choice(['不限', '大专', '大专', '本科'])
        note = random.choice(REQ_NOTES_M)
    intro = make_intro(g, tags, job, hometown, age, bday.year, yn)
    online = random.choices(['在线', '刚刚活跃', '今日活跃', '3天内活跃'], weights=[4, 5, 7, 3])[0]
    p = {
        'id': f'{"F" if g=="F" else "M"}{idx:03d}',
        'nickname': (F_NAMES if g == 'F' else M_NAMES)[idx-1],
        'gender': g,
        'age': age,
        'birthYear': bday.year,
        'birthday': f'{bday.month}月{bday.day}日',
        'zodiac': zodiac_of(bday.month, bday.day),
        'height': height,
        'weight': weight,
        'education': edu,
        'school': random.choice(SCHOOLS),
        'job': job,
        'industry': ind,
        'employerType': etype,
        'income': income,
        'marital': marital,
        'children': children,
        'ethnicity': eth,
        'hometown': hometown,
        'yearsInCity': yn,
        'districtCode': code,
        'district': DISTRICTS[code]['name'],
        'place': place,
        'lng': lng,
        'lat': lat,
        'house': house,
        'car': car,
        'smoke': random.choices(['不吸烟', '偶尔', '吸烟'], weights=[10, 2, 1] if g == 'F' else [7, 2, 2])[0],
        'drink': random.choices(['不饮酒', '社交场合', '偶尔小酌'], weights=[5, 4, 3])[0],
        'wantKids': random.choices(['想要1-2个', '想要1个', '随缘', '暂不考虑'], weights=[5, 3, 3, 1])[0],
        'marriagePlan': random.choices(['一年内', '两年内', '顺其自然'], weights=[3, 4, 5])[0],
        'tags': tags,
        'intro': intro,
        'req': {'ageMin': amin, 'ageMax': amax, 'heightMin': hmin, 'educationMin': edu_min,
                'incomeMin': 0 if g == 'F' else random.choice([0, 8, 12]), 'note': note},
        'verified': random.random() < 0.87,
        'vipLevel': random.choices(['普通', '黄金', '钻石'], weights=[60, 28, 12])[0],
        'online': online,
        'lastActive': {'在线': '当前在线', '刚刚活跃': '5分钟前', '今日活跃': random.choice(['1小时前', '3小时前', '今天 09:12']),
                       '3天内活跃': random.choice(['昨天', '2天前', '3天前'])}[online],
        'hearts': int(random.lognormvariate(4.6, 0.75)) + 8,
        'views': int(random.lognormvariate(6.8, 0.8)),
        'matchScore': random.randint(76, 98),
        'complete': random.randint(78, 100),
        'registeredAt': daterange(datetime.date(2024, 1, 1), datetime.date(2026, 10, 20)),
    }
    return p

# 四区分配: 新城16 赛罕18 回民13 玉泉13
PLAN = [(150102, 8, 8), (150105, 9, 9), (150103, 7, 6), (150104, 6, 7)]
profiles = []
fi, mi = 0, 0
for code, nf, nm in PLAN:
    for _ in range(nf):
        fi += 1
        profiles.append(make('F', fi, code))
    for _ in range(nm):
        mi += 1
        profiles.append(make('M', mi, code))

# 头像分配（同性别内洗牌，避免照片场景与职业强绑定）
fidx = list(range(1, 31))
midx = list(range(1, 31))
random.shuffle(fidx)
random.shuffle(midx)
fseq, mseq = fidx[:], midx[:]
for p in profiles:
    if p['gender'] == 'F':
        p['avatar'] = f'assets/img/avatars/f{fseq.pop(0):02d}.jpg'
    else:
        p['avatar'] = f'assets/img/avatars/m{mseq.pop(0):02d}.jpg'

# 让收入更接地气（展示用“年收入”区间，前端按区间展示）
def income_band(v):
    if v < 10: return '8-10万'
    if v < 15: return '10-15万'
    if v < 20: return '15-20万'
    if v < 30: return '20-30万'
    if v < 50: return '30-50万'
    return '50万以上'
for p in profiles:
    p['incomeBand'] = income_band(p['income'])

# 区中心（GCJ，用于 flyTo）
def gcj_center(code):
    f = feats[code]
    x0, x1, y0, y1 = BOXES[code]
    cx, cy = (x0+x1)/2, (y0+y1)/2
    gx, gy = wgs2gcj(cx, cy)
    return [round(gx, 6), round(gy, 6)]

out = {
    'meta': {
        'brand': '青城有你',
        'city': '呼和浩特',
        'generatedAt': '2026-10-27',
        'note': '演示数据，人物均为虚构，照片为AI生成',
        'centerWgs': [111.740, 40.828],
        'center': [round(wgs2gcj(111.740, 40.828)[0], 6), round(wgs2gcj(111.740, 40.828)[1], 6)],
        'total': len(profiles),
    },
    'districts': [
        dict(code=code, **DISTRICTS[code],
             center=gcj_center(code),
             male=sum(1 for p in profiles if p['districtCode'] == code and p['gender'] == 'M'),
             female=sum(1 for p in profiles if p['districtCode'] == code and p['gender'] == 'F'))
        for code in [150102, 150103, 150104, 150105]
    ],
    'profiles': profiles,
}

os.makedirs(os.path.join(ROOT, 'assets/js'), exist_ok=True)
with open(os.path.join(ROOT, 'assets/js/data.js'), 'w', encoding='utf-8') as f:
    f.write('/* 青城有你 · 相亲地图模拟数据（自动生成，请勿商用） */\n')
    f.write('window.HHHT_DATA = ' + json.dumps(out, ensure_ascii=False, indent=1) + ';\n')

# 裁剪边界 GeoJSON，只保留四区
trim = {'type': 'FeatureCollection', 'features': [feats[c] for c in [150102, 150103, 150104, 150105]]}
with open(os.path.join(ROOT, 'assets/data/districts.json'), 'w', encoding='utf-8') as f:
    json.dump(trim, f, ensure_ascii=False)

print(f'生成 {len(profiles)} 人；女 {sum(1 for p in profiles if p["gender"]=="F")} 男 {sum(1 for p in profiles if p["gender"]=="M")}')
for d in out['districts']:
    print(d['name'], '男', d['male'], '女', d['female'], d['center'])
