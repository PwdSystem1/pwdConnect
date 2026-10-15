import ProfilePage from '../components/ProfilePage';
import usePortalAccount from '../components/usePortalAccount';
export default function PWDProfile(props){const account=usePortalAccount();return <ProfilePage kind="user" account={account} accessibility={props}/>;}
