import LoginPage from '../../shared/components/LoginPage';

export default function AdminLogin() {
  return (
    <LoginPage
      role="admin"
      brandLabel="ADMIN COMMAND CENTER"
      homePath="/dashboard"
      accountHint="admin@lifeline.demo / Lifeline@123"
    />
  );
}
