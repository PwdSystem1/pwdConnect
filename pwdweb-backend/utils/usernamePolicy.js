function validUsername(value){return typeof value==='string'&&value.length>=3&&value.length<=50&&value===value.trim()&&!/[\u0000-\u001f\u007f-\u009f]/u.test(value);}
module.exports={validUsername};
