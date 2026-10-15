import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function usePortalAccount() {
  const navigate=useNavigate();
  const [user,setUser]=useState(null);
  useEffect(()=>{
    try {
      const session=JSON.parse(localStorage.getItem('userSession')||'null');
      if(!session?.pwd_id){navigate('/',{replace:true});return;}
      setUser(session);
    } catch {navigate('/',{replace:true});}
  },[navigate]);
  return user;
}
