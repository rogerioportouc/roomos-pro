import { Outlet, NavLink } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
const NAV = [
  {to:'/',l:'Dashboard',i:'◈',s:'Principal'},
  {to:'/floor-map',l:'Planta Baixa',i:'⊞'},
  {to:'/rooms',l:'Salas',i:'⊡'},
  {to:'/bookings',l:'Reservas',i:'◷'},
  {to:'/timeline',l:'Timeline',i:'⟺'},
  {to:'/users',l:'Usuários',i:'⊛',s:'Admin',a:true},
  {to:'/api',l:'API',i:'⋯',a:true},
  {to:'/appearance',l:'Aparência',i:'◑',a:true},
  {to:'/settings',l:'Configurações',i:'◎',a:true},
]
export default function AppShell() {
  const {user,logout} = useAuthStore()
  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon">R</div>
          <div><div className="logo-text">RoomOS Pro</div><div className="logo-sub">Reserva de Salas</div></div>
        </div>
        <nav className="sidebar-nav">
          {NAV.map(item=>{
            if((item as any).a && user?.role!=="admin") return null
            return <div key={item.to}>{(item as any).s&&<div className="nav-section">{(item as any).s}</div>}<NavLink to={item.to} end={item.to==="/"} className={({isActive})=>`nav-item${isActive?" active":""}`}><span className="nav-icon">{item.i}</span>{item.l}</NavLink></div>
          })}
        </nav>
        <div style={{padding:"12px 8px",borderTop:"1px solid var(--c-border)"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",background:"var(--c-surface-2)",borderRadius:"var(--r-md)"}}>
            <div style={{width:28,height:28,borderRadius:"var(--r-md)",background:"var(--c-primary)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:11,fontWeight:600,flexShrink:0}}>{user?.name?.split(" ").map((w:string)=>w[0]).join("").slice(0,2)}</div>
            <div style={{flex:1,minWidth:0}}><div style={{fontSize:12,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user?.name}</div><div style={{fontSize:10,color:"var(--c-text-3)",textTransform:"uppercase"}}>{user?.role}</div></div>
            <button onClick={logout} title="Sair" style={{background:"none",border:"none",cursor:"pointer",color:"var(--c-text-3)",fontSize:14}}>⏻</button>
          </div>
        </div>
      </aside>
      <div className="main-area"><Outlet /></div>
    </div>
  )
}
