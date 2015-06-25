var router = require('express').Router();
var AV = require('leanengine');
var url = require("url");

var AVSdk = require('avoscloud-sdk').AV;
AVSdk.initialize("kaxu5q5v5se28yovk2gx66eko4otjt4mfomrmjc7gfawvga4", "6urqrjr2kz6zyv6tgnra4v39sywt1kezawnheodjgu4h1fbh");


// `AV.Object.extend` 方法一定要放在全局变量，否则会造成堆栈溢出。
// 详见： https://leancloud.cn/docs/js_guide.html#对象
var Todo = AV.Object.extend('Todo');
var GameRoom = AV.Object.extend('GameRoom');



//为了减少查询，使用全局缓存对象
function GameRoomCache(roomName, creator ,id) {
        this.roomName = roomName;
        this.gaming = false;
        this.roomId = id;
        this.creator = creator;
        this.otherPlayer = "";
    }

//下子进程
function GameProgress(roomId,operator,positionX,positionY,date) {
  this.roomId = roomId;
  this.operator = operator;
  this.positionX = positionX;
  this.positionY = positionY;
  this.date = Date();
}


var gameRoomHashMap = new HashMap();
var gameProgressHashMap = new HashMap();
//HashMap
function HashMap() {
  var size = 0;
  var entry = new Object();

  this.put = function (key, value) {
    entry[key] = value;
    size++;
  };

  this.putAll = function (map) {
    if (typeof map == "object" && !map.sort) {
      for (var key in map) {
        this.put(key, map[key]);
      }
    } else {
      throw "输入类型不正确，必须是HashMap类型！";
    }
  };

  this.get = function (key) {
    return entry[key];
  };

  this.remove = function (key) {
    if (size == 0)
      return;
    delete entry[key];
    size--;
  };

  this.containsKey = function (key) {
    if (entry[key]) {
      return true;
    }
    return false;
  };

  this.containsValue = function (value) {
    for (var key in entry) {
      if (entry[key] == value) {
        return true;
      }
    }
    return false;
  };

  this.clear = function () {
    entry = new Object();
    size = 0;
  };

  this.isEmpty = function () {
    return size == 0;
  };

  this.size = function () {
    return size;
  };

  this.keySet = function () {
    var keys = new Array();
    for (var key in entry) {
      keys.push(key);
    }
    return keys;
  };

  this.entrySet = function () {
    var entrys = new Array();
    for (var key in entry) {
      var et = new Object();
      et[key] = entry[key];
      entrys.push(et);
    }
    return entrys;
  };

  this.values = function () {
    var values = new Array();
    for (var key in entry) {
      values.push(entry[key]);
    }
    return values;
  };

  this.each = function (cb) {
    for (var key in entry) {
      cb.call(this, key, entry[key]);
    }
  };

  this.toString = function () {
    return obj2str(entry);
  };

  function obj2str(o) {
    var r = [];
    if (typeof o == "string")
      return "\"" + o.replace(/([\'\"\\])/g, "\\$1").replace(/(\n)/g, "\\n").replace(/(\r)/g, "\\r").replace(/(\t)/g, "\\t") + "\"";
    if (typeof o == "object") {
      for (var i in o)
        r.push("\"" + i + "\":" + obj2str(o[i]));
      r = "{" + r.join() + "}";
      return r;
    }
    return o.toString();
  }
}

// 查询 Todo 列表
router.get('/', function(req, res, next) {
  console.log(req.query.test);
  var query = new AV.Query(Todo);
  query.descending('createdAt');
  query.find({
    success: function(results) {
      res.render('todos', {
        title: 'TODO 列表',
        todos: results
      });
    },
    error: function(err) {
      if (err.code === 101) {
        // 该错误的信息为：{ code: 101, message: 'Class or object doesn\'t exists.' }，说明 Todo 数据表还未创建，所以返回空的 Todo 列表。
        // 具体的错误代码详见：https://leancloud.cn/docs/error_code.html
        res.render('todos', {
          title: 'TODO 列表',
          todos: []
        });
      } else {
        next(err);
      }
    }
  });
});

// 新增 Todo 项目
router.post('/', function(req, res, next) {
  var content = req.body.content;
  console.log(content);
  var todo = new Todo();
  todo.set('content', content);
  todo.save(null, {
    success: function(todo) {
      res.redirect('/todos');
    },
    error: function(err) {
      next(err);
    }
  })
})

//登陆
router.post('/login',function(req,res,next) {
  AV.User.logIn(req.body.username, req.body.password).then(function() {
        //登录成功，avosExpressCookieSession会自动将登录用户信息存储到cookie
        if (req.AV.user) {
            // 如果已经登录，发送当前登录用户信息。
            res.send(req.AV.user.id);
        } else {
            res.send('登陸失敗!')
        }

    }, function(error) {
        res.send('登陸失敗!' + error.message + ' ' + error.code);
    });
});

//Get版登录
router.get('/login',function(req,res,next) {
  console.log(req.query.username + ' ' + req.query.password);
  AV.User.logIn(req.query.username, req.query.password).then(function() {
        //登录成功，avosExpressCookieSession会自动将登录用户信息存储到cookie
        if (req.AV.user) {
            // 如果已经登录，发送当前登录用户信息。
            res.send(req.AV.user.id);
        } else {
            res.send('no')
        }
    }, function(error) {
        res.send('no');
    });
});

//注册
router.post('/register',function(req,res,next) {

    console.log(req.body.u);
    var user = new AV.User();
    user.set("username", req.body.username);
    user.set("password", req.body.password);

    user.signUp(null, {
      success: function(user) {
        // Hooray! Let them use the app now.
        res.send(user.id);
      },
      error: function(user, error) {
        res.send('注册失败!' + error.message + ' ' + error.code);
      }
    });
});

//Get版注册
router.get('/register',function(req,res,next) {
  var user = new AV.User();
  user.set("username", req.query.username);
  user.set("password", req.query.password);

  user.signUp(null, {
    success: function(user) {
      // Hooray! Let them use the app now.
      res.send(user.id);
    },
    error: function(user, error) {
      res.send('no');
    }
  });
});

//获取所有可用的游戏房间
router.get('/gamerooms',function(req,res,next) {
  console.log('query new rooms');
  var query = new AV.Query(GameRoom);
  query.descending('createdAt');
  query.equalTo('gaming',false);
  query.find({
    success: function(results) {
      res.send(results);
    },
    error: function(err) {
      res.send('no');
    }
  });
});

//创建新的游戏房间
router.get('/createroom',function(req,res,next) {
  var name = req.query.roomname;
  var creator = req.query.creator;

  var newRoom = new GameRoom();
  newRoom.set("roomName",name);
  newRoom.set("creator",creator);
  newRoom.set("joiner","");
  newRoom.set("gaming",false);
  newRoom.save(null, {
  success: function(newRoom) {

    var newRoomTemp = new GameRoomCache(name,creator,newRoom.id);
    gameRoomHashMap.put(newRoom.id,newRoomTemp);

    console.log('////////////////////////////////////////////');
    console.log(gameRoomHashMap.toString());
    console.log('////////////////////////////////////////////');
    res.send(newRoom.id);
  },
  error: function(newRoom, error) {
    res.send('no');
  }
});
});

//加入游戏房间
router.get('/joingame',function(req,res,next) {
  var joiner = req.query.joiner;
  var targetRoom = req.query.targetRoom;
  var query = new AV.Query(GameRoom);
  query.get(targetRoom, {
  success: function(gameRoom) {
    gameRoom.set('gaming',true);
    gameRoom.set('joiner',joiner);
    gameRoom.save();

    var temp = gameRoomHashMap.get(gameRoom.id);
    temp.gaming = true;
    temp.otherPlayer = joiner;

    console.log('////////////////////////////////////////////');
    console.log(gameRoomHashMap.toString());
    console.log('////////////////////////////////////////////');
    res.send('yes');
  },
  error: function(object, error) {
    res.send('no');
  }
});
});

//创建者等待玩家加入
router.get('/getotherplayer',function(req,res,next){
  var targetRoom = req.query.targetRoom;
  console.log('获取#' + targetRoom + ' 的最新信息');
  var temp = gameRoomHashMap.get(targetRoom);
  if (temp) {
    if (temp.gaming == true) {
      res.send(temp.otherPlayer);
    } else {
      res.send('no');
    }
  }
});

//请求获取最新下子情况
router.get('/getnewest',function(req,res,next){
  var targetOperator = req.query.targetOperator;
  var targetRoom = req.query.targetRoom;
  var temp = gameProgressHashMap.get(targetRoom);

  console.log(targetOperator + ' ' + targetRoom);

  if (temp) {
    if (temp.operator == targetOperator) {
      console.log('query success!');
      res.send({positionX:temp.positionX,positionY:temp.positionY});
    } else {
      res.send('no');
    }
  } else {
    res.send('no');
  }
});

//发送下子情况
router.get('/sendnewest',function(req,res,next){
  var operator = req.query.operator;
  var targetRoom = req.query.targetRoom;
  var positionX = req.query.positionX;
  var positionY = req.query.positionY;

  var temp = new GameProgress(targetRoom,operator,positionX,positionY);
  gameProgressHashMap.put(targetRoom,temp);

  console.log(operator + ' ' + targetRoom + ' ' + positionX + ' ' + positionY);
  res.send('yes');
});

module.exports = router;
