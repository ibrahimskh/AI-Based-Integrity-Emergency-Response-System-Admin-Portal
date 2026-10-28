import LoginPage from '../../shared/components/LoginPage';

export default function AdminLogin() {
  return (
    <LoginPage
      role="admin"
      brandLabel="ADMIN COMMAND CENTER"
      homePath="/dashboard"
      accountHint="Sign in with a Firebase Authentication account that has admin access."
    />
  );
}
