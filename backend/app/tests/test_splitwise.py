import unittest
import sys
import os

# Adiciona o diretório raiz ao path para conseguir importar o app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.modules.investments.service import calculate_settlement


class TestSplitwiseLogic(unittest.TestCase):

    def test_user_paid_all(self):
        """
        Cenário: Usuário gastou 100, Parceiro gastou 0.
        Total: 100. Parte justa: 50.
        Usuário pagou 100, deveria pagar 50 -> Recebe 50 (Saldo +50).
        """
        result = calculate_settlement(100.0, 0.0)
        self.assertEqual(result["value"], 50.0)
        self.assertEqual(result["total_shared_expenses"], 100.0)

    def test_partner_paid_all(self):
        """
        Cenário: Usuário gastou 0, Parceiro gastou 100.
        Total: 100. Parte justa: 50.
        Usuário pagou 0, deveria pagar 50 -> Deve 50 (Saldo -50).
        """
        result = calculate_settlement(0.0, 100.0)
        self.assertEqual(result["value"], -50.0)
        self.assertEqual(result["fair_share_per_person"], 50.0)

    def test_equal_split(self):
        """
        Cenário: Ambos gastaram 50.
        Total: 100. Parte justa: 50.
        Saldo deve ser 0.
        """
        result = calculate_settlement(50.0, 50.0)
        self.assertEqual(result["value"], 0.0)

    def test_unequal_split(self):
        """
        Cenário: Usuário 300, Parceiro 100.
        Total: 400. Parte justa: 200.
        Usuário pagou 300 -> Recebe 100 (+100).
        """
        result = calculate_settlement(300.0, 100.0)
        self.assertEqual(result["value"], 100.0)

    def test_negative_inputs(self):
        """
        Garante que funciona mesmo se os inputs vierem negativos (saídas no banco).
        """
        result = calculate_settlement(-100.0, -0.0)
        self.assertEqual(result["value"], 50.0)


if __name__ == "__main__":
    unittest.main()
